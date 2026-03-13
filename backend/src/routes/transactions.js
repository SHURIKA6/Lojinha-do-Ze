import { Hono } from 'hono';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const router = new Hono();

const transactionSchema = z.object({
  type: z.enum(['receita', 'despesa']),
  category: z.string().min(2, 'Categoria é obrigatória'),
  description: z.string().optional(),
  value: z.number().positive('Valor deve ser positivo'),
  date: z.string().optional()
});

router.use('*', authMiddleware, adminOnly);

// GET /api/transactions
router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const type = c.req.query('type');
    let query = 'SELECT * FROM transactions';
    const params = [];
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    query += ' ORDER BY date DESC, created_at DESC';
    const { rows } = await db.query(query, params);
    return c.json(rows);
  } catch (err) {
    console.error('Transactions GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/transactions
router.post('/', zValidator('json', transactionSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const db = c.get('db');
    const { type, category, description, value, date } = c.req.valid('json');
    const { rows } = await db.query(
      `INSERT INTO transactions (type, category, description, value, date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, category, description, value, date || new Date().toISOString().split('T')[0]]
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
    const db = c.get('db');
    const id = c.req.param('id');
    const { rowCount } = await db.query('DELETE FROM transactions WHERE id = $1', [id]);
    if (rowCount === 0) return c.json({ error: 'Transação não encontrada' }, 404);
    return c.json({ message: 'Transação excluída' });
  } catch (err) {
    console.error('Transactions DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;
