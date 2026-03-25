import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { productCreateSchema, productUpdateSchema } from '../domain/schemas.js';
import {
  cleanOptionalString,
  isUniqueViolation,
  isValidUuid,
  uniqueFieldLabel,
} from '../utils/normalize.js';
import { jsonError, setNoStore, validationError } from '../utils/http.js';
import { logger } from '../utils/logger.js';

// Validação consistente para IDs (suporta UUID e integer)
function isValidId(id) {
  if (typeof id !== 'string') return false;
  return isValidUuid(id) || /^\d+$/.test(id);
}

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  const db = c.get('db');
  const limit = Math.min(parseInt(c.req.query('limit')) || 50, 100);
  const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);

  const { rows } = await db.query(
    `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
     FROM products
     ORDER BY name
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  setNoStore(c);
  return c.json(rows);
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');
  const { rows } = await db.query(
    `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
     FROM products
     WHERE id = $1`,
    [c.req.param('id')]
  );

  if (!rows.length) {
    return jsonError(c, 404, 'Produto não encontrado');
  }

  setNoStore(c);
  return c.json(rows[0]);
});

router.post(
  '/',
  zValidator('json', productCreateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const payload = c.req.valid('json');
      const { rows } = await client.query(
        `INSERT INTO products (code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
        [
          payload.code.trim(),
          payload.name.trim(),
          cleanOptionalString(payload.description) || '',
          cleanOptionalString(payload.photo) || '',
          payload.category,
          payload.quantity ?? 0,
          payload.min_stock ?? 5,
          payload.cost_price ?? 0,
          payload.sale_price ?? 0,
          cleanOptionalString(payload.supplier) || '',
          payload.is_active ?? true,
        ]
      );

      const product = rows[0];

      // Se houver estoque inicial e um preço de custo, registra como despesa
      if (product.quantity > 0 && product.cost_price > 0) {
        const totalCost = product.quantity * product.cost_price;
        await client.query(
          `INSERT INTO transactions (type, category, description, value, date)
           VALUES ($1, $2, $3, $4, NOW())`,
          ['despesa', 'Compra de estoque', `Estoque inicial: ${product.name} (${product.quantity} un)`, totalCost]
        );
      }

      await client.query('COMMIT');
      return c.json(product, 201);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }

      logger.error('Erro no POST de Produtos', error);
      return jsonError(c, 500, 'Erro ao cadastrar o novo produto.');
    } finally {
      client.release();
    }
  }
);

router.put(
  '/:id',
  zValidator('json', productUpdateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');
      const data = c.req.valid('json');

      // Busca o estado atual para comparação
      const { rows: currentRows } = await client.query(
        'SELECT name, quantity, cost_price FROM products WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (!currentRows.length) {
        await client.query('ROLLBACK');
        return jsonError(c, 404, 'Produto não encontrado');
      }

      const oldProduct = currentRows[0];
      const fields = [];
      const values = [];

      const setField = (column, value) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
      };

      if (data.code !== undefined) setField('code', data.code.trim());
      if (data.name !== undefined) setField('name', data.name.trim());
      if (data.description !== undefined) setField('description', cleanOptionalString(data.description) || '');
      if (data.photo !== undefined) setField('photo', cleanOptionalString(data.photo) || '');
      if (data.category !== undefined) setField('category', data.category);
      if (data.quantity !== undefined) setField('quantity', data.quantity);
      if (data.min_stock !== undefined) setField('min_stock', data.min_stock);
      if (data.cost_price !== undefined) setField('cost_price', data.cost_price);
      if (data.sale_price !== undefined) setField('sale_price', data.sale_price);
      if (data.supplier !== undefined) setField('supplier', cleanOptionalString(data.supplier) || '');
      if (data.is_active !== undefined) setField('is_active', data.is_active);

      values.push(id);

      const { rows } = await client.query(
        `UPDATE products
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
        values
      );

      const updatedProduct = rows[0];

      // Se a quantidade aumentou, registra como uma despesa de reposição
      if (data.quantity !== undefined && data.quantity > oldProduct.quantity) {
        const diff = data.quantity - oldProduct.quantity;
        const currentCostPrice = data.cost_price !== undefined ? data.cost_price : oldProduct.cost_price;
        
        if (currentCostPrice > 0) {
          const totalCost = diff * currentCostPrice;
          await client.query(
            `INSERT INTO transactions (type, category, description, value, date)
             VALUES ($1, $2, $3, $4, NOW())`,
            ['despesa', 'Compra de estoque', `Reposição: ${updatedProduct.name} (+${diff} un)`, totalCost]
          );
        }
      }

      await client.query('COMMIT');
      return c.json(updatedProduct);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }

      logger.error('Erro no PUT de Produtos', error);
      return jsonError(c, 500, 'Erro ao salvar as edições do produto.');
    } finally {
      client.release();
    }
  }
);

router.delete('/:id', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');
    const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [id]);
    if (!rowCount) {
      return jsonError(c, 404, 'Produto não encontrado');
    }

    return c.json({ message: 'Produto excluído' });
  } catch (error) {
    logger.error('Erro no DELETE de Produtos', error);
    return jsonError(c, 500, 'Erro ao excluir o produto.');
  }
});

export default router;
