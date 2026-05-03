import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware, csrfMiddleware } from '../../core/middleware/auth';
import { transactionCreateSchema } from '../../core/domain/schemas';
import { cleanOptionalString } from '../../core/utils/normalize';
import { jsonError, setNoStore, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { Bindings, Variables } from '../../core/types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use('*', authMiddleware, adminOnly);

/**
 * Rota GET /
 * 
 * Lista todas as transações financeiras (receitas e despesas).
 * 
 * Esta rota permite consultar o histórico de transações registradas no sistema,
 * com suporte a filtros e paginação.
 * 
 * Query params:
 * - type: Filtra por tipo ('receita' ou 'despesa'). Opcional.
 * - limit: Número máximo de registros (padrão: 50, máximo: 100)
 * - offset: Número de registros para pular (padrão: 0)
 * 
 * Response: Array de transações ordenadas por data decrescente.
 * 
 * Middleware: authMiddleware + adminOnly (apenas administradores)
 */
router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const type = c.req.query('type');
    const limitQuery = c.req.query('limit');
    const offsetQuery = c.req.query('offset');
    const limit = Math.min(parseInt(limitQuery || '') || 50, 100);
    const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);

    if (type && !['receita', 'despesa'].includes(type)) {
      setNoStore(c as any);
      return jsonError(c, 400, 'Tipo de transação inválido');
    }

    const params: any[] = [];
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
    setNoStore(c as any);
    return c.json(rows);
  } catch (error) {
    logger.error('Erro no GET de Transações', error as Error);
    return jsonError(c, 500, 'Erro ao carregar a lista de transações.');
  }
});

/**
 * Rota POST /
 * 
 * Registra uma nova transação financeira (receita ou despesa).
 * 
 * Esta rota é usada para registrar manualmente transações financeiras no sistema,
 * como receitas de vendas (além das geradas automaticamente via PIX) ou despesas
 * operacionais da loja.
 * 
 * Body (validado via transactionCreateSchema):
 * - type: 'receita' ou 'despesa'
 * - category: Categoria da transação (ex: "Venda de produtos", "Aluguel")
 * - description: Descrição detalhada da transação
 * - value: Valor da transação (deve ser positivo)
 * - date: Data da transação (opcional, padrão: agora)
 * 
 * Response: Transação criada com ID e timestamps.
 * 
 * Middleware: authMiddleware + adminOnly + csrfMiddleware
 */
router.post(
  '/',
  csrfMiddleware,
  zValidator('json', transactionCreateSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const payload = c.req.valid('json') as any;
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
      logger.error('Erro no POST de Transações', error as Error);
      return jsonError(c, 500, 'Erro ao registrar a transação.');
    }
  }
);

/**
 * Rota DELETE /:id
 * 
 * Exclui uma transação financeira pelo ID.
 * 
 * Esta rota permite remover transações registradas incorretamente ou
 * que precisam ser estornadas. A exclusão é permanente.
 * 
 * Params:
 * - id: ID numérico da transação a ser excluída
 * 
 * Response: { message: 'Transação excluída' } em caso de sucesso.
 * 
 * Erros possíveis:
 * - 400: ID inválido (não numérico ou menor/igual a zero)
 * - 404: Transação não encontrada
 * 
 * Middleware: authMiddleware + adminOnly + csrfMiddleware
 */
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
    logger.error('Erro no DELETE de Transações', error as Error, { id: c.req.param('id') });
    return jsonError(c, 500, 'Erro ao cancelar a transação.');
  }
});

export default router;
