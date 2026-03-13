import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware, csrfMiddleware } from '../middleware/auth.js';
import { transactionCreateSchema } from '../domain/schemas.js';
import { cleanOptionalString } from '../utils/normalize.js';
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
    const type = c.req.query('type');
    const params = [];
    let query = `
      SELECT id, type, category, description, value, date, order_id, created_at
      FROM transactions
    `;

    if (type) {
      params.push(type);
      query += ` WHERE type = $${params.length}`;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const { rows } = await db.query(query, params);
    return c.json(rows);
  } catch (error) {
    console.error('Transactions GET error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.post(
  '/',
  csrfMiddleware,
  zValidator('json', transactionCreateSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const payload = c.req.valid('json');
      const { rows } = await db.query(
        `INSERT INTO transactions (type, category, description, value, date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, type, category, description, value, date, order_id, created_at`,
        [
          payload.type,
          payload.category.trim(),
          cleanOptionalString(payload.description) || '',
          payload.value,
          payload.date || new Date().toISOString(),
        ]
      );
      return c.json(rows[0], 201);
    } catch (error) {
      console.error('Transactions POST error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    }
  }
);

router.delete('/:id', csrfMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const { rowCount } = await db.query('DELETE FROM transactions WHERE id = $1', [c.req.param('id')]);
    if (!rowCount) {
      return jsonError(c, 404, 'Transação não encontrada');
    }
    return c.json({ message: 'Transação excluída' });
  } catch (error) {
    console.error('Transactions DELETE error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

export default router;
