import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = new Hono();

// GET /api/orders — list all orders (adm) or user orders (customer)
router.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');
    
    if (user.role === 'customer') {
      const { rows } = await pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [user.id]);
      return c.json(rows);
    }

    // Admin logic
    let query = 'SELECT * FROM orders';
    let params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    return c.json(rows);
  } catch (err) {
    console.error('Orders GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', authMiddleware, adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const { rows } = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) return c.json({ error: 'Pedido não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Orders PATCH error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    if (rowCount === 0) return c.json({ error: 'Pedido não encontrado' }, 404);
    return c.json({ message: 'Pedido excluído' });
  } catch (err) {
    console.error('Orders DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;


