import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = new Hono();

// Auth required for all products routes
router.use('*', authMiddleware);

// GET /api/products (accessible to both admin and authenticated customers)
router.get('/', async (c) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY name');
    return c.json(rows);
  } catch (err) {
    console.error('Products GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// GET /api/products/:id
router.get('/:id', async (c) => {
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

// POST /api/products (Admin Only)
router.post('/', adminOnly, async (c) => {
  try {
    const { code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier } = await c.req.json();
    const { rows } = await pool.query(
      `INSERT INTO products (code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, name, description || '', photo || '', category || 'Outros', quantity || 0, min_stock || 5, cost_price || 0, sale_price || 0, supplier || '']
    );
    return c.json(rows[0], 201);
  } catch (err) {
    console.error('Products POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PUT /api/products/:id (Admin Only)
router.put('/:id', adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier } = await c.req.json();
    const { rows } = await pool.query(
      `UPDATE products SET code=$1, name=$2, description=$3, photo=$4, category=$5, quantity=$6, min_stock=$7,
       cost_price=$8, sale_price=$9, supplier=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, id]
    );
    if (rows.length === 0) return c.json({ error: 'Produto não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Products PUT error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// DELETE /api/products/:id (Admin Only)
router.delete('/:id', adminOnly, async (c) => {
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


