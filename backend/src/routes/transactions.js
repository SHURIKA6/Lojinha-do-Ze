import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware, csrfMiddleware } from '../middleware/auth.js';
import { transactionCreateSchema } from '../domain/schemas.js';
import { cleanOptionalString } from '../utils/normalize.js';
import { jsonError, setNoStore, validationError } from '../utils/http.js';
import { logger } from '../utils/logger.js';

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const type = c.req.query('type');
    const limit = Math.min(parseInt(c.req.query('limit')) || 50, 100);
    const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);

    // Valida type contra enum permitido
    if (type && !['receita', 'despesa'].includes(type)) {
      setNoStore(c);
      return jsonError(c, 400, 'Tipo de transação inválido');
    }

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
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    setNoStore(c);
    return c.json(rows);
  } catch (error) {
    logger.error('Erro no GET de Transações', error);
    return jsonError(c, 500, 'Erro ao carregar a lista de transações.');
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
      logger.error('Erro no POST de Transações', error);
      return jsonError(c, 500, 'Erro ao registrar a transação.');
    }
  }
);

router.delete('/:id', csrfMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const id = parseInt(c.req.param('id'), 10);
    
    if (isNaN(id) || id <= 0) {
      return jsonError(c, 400, 'ID inválido');
    }

    const { rowCount } = await db.query('DELETE FROM transactions WHERE id = $1', [id]);
    if (!rowCount) {
      return jsonError(c, 404, 'Transação não encontrada');
    }
    return c.json({ message: 'Transação excluída' });
  } catch (error) {
    logger.error('Erro no DELETE de Transações', error, { id: c.req.param('id') });
    return jsonError(c, 500, 'Erro ao cancelar a transação.');
  }
});

export default router;
