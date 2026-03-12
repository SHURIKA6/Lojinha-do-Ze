import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = new Hono();

router.use('*', authMiddleware, adminOnly);

// GET /api/transactions
router.get('/', async (c) => {
  try {
    const type = c.req.query('type');
    let query = 'SELECT * FROM transactions';
    let params = [];
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const { rows } = await pool.query(query, params);
    return c.json(rows);
  } catch (err) {
    console.error('Transactions GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/transactions
router.post('/', async (c) => {
  try {
    const { type, category, description, value, date } = await c.req.json();
    const { rows } = await pool.query(
      `INSERT INTO transactions (type, category, description, value, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, category, description, value || 0, date || new Date().toISOString().split('T')[0]]
    );
    return c.json(rows[0], 201);
  } catch (err) {
    console.error('Transactions POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { rowCount } = await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    if (rowCount === 0) return c.json({ error: 'Transação não encontrada' }, 404);
    return c.json({ message: 'Transação excluída' });
  } catch (err) {
    console.error('Transactions DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;



