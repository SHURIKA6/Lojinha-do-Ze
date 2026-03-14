import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware, csrfMiddleware } from '../middleware/auth.js';
import { productCreateSchema, productUpdateSchema } from '../domain/schemas.js';
import {
  cleanOptionalString,
  isUniqueViolation,
  uniqueFieldLabel,
} from '../utils/normalize.js';
import { jsonError } from '../utils/http.js';

const router = new Hono();

function validationError(result, c) {
  if (!result.success) {
    return jsonError(c, 400, result.error.issues[0].message);
  }

  return undefined;
}

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const { rows } = await db.query(
      `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
       FROM products
       ORDER BY name`
    );
    return c.json(rows);
  } catch (error) {
    console.error('Products GET error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const { rows } = await db.query(
      `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
       FROM products
       WHERE id = $1`,
      [c.req.param('id')]
    );

    if (!rows.length) {
      return jsonError(c, 404, 'Produto não encontrado');
    }

    return c.json(rows[0]);
  } catch (error) {
    console.error('Products GET /:id error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.post(
  '/',
  csrfMiddleware,
  zValidator('json', productCreateSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const payload = c.req.valid('json');
      const { rows } = await db.query(
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
      return c.json(rows[0], 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }

      console.error('Products POST error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    }
  }
);

router.put(
  '/:id',
  csrfMiddleware,
  zValidator('json', productUpdateSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const data = c.req.valid('json');
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

      values.push(c.req.param('id'));

      const { rows } = await db.query(
        `UPDATE products
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
        values
      );

      if (!rows.length) {
        return jsonError(c, 404, 'Produto não encontrado');
      }

      return c.json(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }

      console.error('Products PUT error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    }
  }
);

router.delete('/:id', csrfMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [c.req.param('id')]);
    if (!rowCount) {
      return jsonError(c, 404, 'Produto não encontrado');
    }

    return c.json({ message: 'Produto excluído' });
  } catch (error) {
    console.error('Products DELETE error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

export default router;
