import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  cleanOptionalString,
  isUniqueViolation,
  uniqueFieldLabel,
} from '../utils/normalize.js';

const router = new Hono();

const createProductSchema = z.object({
  code: z.string().trim().min(1, 'Código do produto é obrigatório'),
  name: z.string().trim().min(3, 'Nome do produto deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  photo: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().int().nonnegative().optional(),
  min_stock: z.number().int().nonnegative().optional(),
  cost_price: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  supplier: z.string().optional()
});

const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Informe ao menos um campo para atualização' }
);

// GET routes are accessible to any authenticated user
router.get('/', authMiddleware, async (c) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY name');
    return c.json(rows);
  } catch (err) {
    console.error('Products GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

router.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (rows.length === 0) return c.json({ error: 'Produto não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Products GET /:id error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST, PUT, DELETE routes are admin-only
router.post('/', authMiddleware, adminOnly, zValidator('json', createProductSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
}), async (c) => {
  try {
    const { code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier } = c.req.valid('json');
    const { rows } = await pool.query(
      `INSERT INTO products (code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        code.trim(),
        name.trim(),
        cleanOptionalString(description) || '',
        cleanOptionalString(photo) || '',
        cleanOptionalString(category) || 'Outros',
        quantity ?? 0,
        min_stock ?? 5,
        cost_price ?? 0,
        sale_price ?? 0,
        cleanOptionalString(supplier) || '',
      ]
    );
    return c.json(rows[0], 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: `${uniqueFieldLabel(err)} já cadastrado` }, 409);
    }
    console.error('Products POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

router.put('/:id', authMiddleware, adminOnly, zValidator('json', updateProductSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
}), async (c) => {
  try {
    const id = c.req.param('id');
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
    if (data.category !== undefined) setField('category', cleanOptionalString(data.category) || 'Outros');
    if (data.quantity !== undefined) setField('quantity', data.quantity);
    if (data.min_stock !== undefined) setField('min_stock', data.min_stock);
    if (data.cost_price !== undefined) setField('cost_price', data.cost_price);
    if (data.sale_price !== undefined) setField('sale_price', data.sale_price);
    if (data.supplier !== undefined) setField('supplier', cleanOptionalString(data.supplier) || '');

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE products SET ${fields.join(', ')}, updated_at=NOW()
       WHERE id=$${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return c.json({ error: 'Produto não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: `${uniqueFieldLabel(err)} já cadastrado` }, 409);
    }
    console.error('Products PUT error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    if (rowCount === 0) return c.json({ error: 'Produto não encontrado' }, 404);
    return c.json({ message: 'Produto excluído' });
  } catch (err) {
    console.error('Products DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;


