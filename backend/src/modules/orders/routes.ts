import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware } from '../../core/middleware/auth';
import { orderStatusSchema } from '../../core/domain/schemas';
import { ORDER_STATUS_VALUES } from '../../core/domain/constants';
import { jsonError, setNoStore, validationError } from '../../core/utils/http';
import { isValidId } from '../../core/utils/normalize';
import { logger } from '../../core/utils/logger';
import * as orderService from './service';
import { Bindings, Variables } from '../../core/types';
import { logSystemEvent } from '../system/logService';

/**
 * Rotas para gerenciamento de pedidos.
 * - GET /: Lista pedidos (customers veem apenas os seus; admins veem todos)
 * - PATCH /:id/status: Atualiza status do pedido (admin only)
 * - DELETE /:id: Exclui um pedido (admin only)
 */
const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const statusQuery = c.req.query('status');
  const limitQuery = c.req.query('limit');
  const offsetQuery = c.req.query('offset');
  const limit = Math.min(parseInt(limitQuery || '') || 50, 100);
  const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);

  try {
    const db = c.get('db');

    if (statusQuery && !ORDER_STATUS_VALUES.includes(statusQuery as any)) {
      setNoStore(c as any);
      return jsonError(c, 400, 'Status inválido');
    }

    const rows = await orderService.getOrders(db, {
      userId: user?.role === 'customer' ? user.id : undefined,
      status: statusQuery,
      limit,
      offset,
    });

    setNoStore(c as any);
    return c.json(rows);
  } catch (error: any) {
    const errorId = crypto.randomUUID().split('-')[0];
    logger.error(`Erro ao buscar pedidos [${errorId}]`, error, { 
      userId: user?.id, 
      role: user?.role,
      statusQuery,
      limit,
      offset
    });
    
    const db = c.get('db');
    const logPromise = logSystemEvent(db, c.env, 'error', `Erro ao buscar pedidos [${errorId}]: ${error.message}`, {
      userId: user?.id,
      statusQuery,
      errorId
    }, error, c.executionCtx).catch(err => logger.error('Falha ao logar erro no banco', err));

    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(logPromise);
    }

    return jsonError(c, 500, 'Erro ao carregar a lista de pedidos.', { errorId });
  }
});

router.patch(
  '/:id/status',
  authMiddleware,
  adminOnly,
  zValidator('json', orderStatusSchema, validationError),
  async (c) => {
    const id = c.req.param('id');
    if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

    const { status, tracking_code } = c.req.valid('json');
    const db = c.get('db');

    try {
      const result = await orderService.updateOrderStatus(db, id, status, c.env, c.executionCtx, tracking_code);

      if (result.error) {
        return jsonError(c, result.error.code, result.error.message);
      }

      return c.json(result.data);
    } catch (error: any) {
      const errorId = crypto.randomUUID().split('-')[0];
      const db = c.get('db');
      logger.error(`Erro ao atualizar status do pedido [${errorId}]`, error, { id: c.req.param('id') });

      const logPromise = logSystemEvent(db, c.env, 'error', `Erro Status Pedido [${errorId}]: ${error.message}`, {
        orderId: c.req.param('id'),
        errorId
      }, error, c.executionCtx).catch(err => logger.error('Falha ao logar erro de status do pedido no banco', err));

      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(logPromise);
      }

      return jsonError(c, 500, 'Erro ao atualizar o status do pedido.', { errorId });
    }
  }
);

router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  try {
    const db = c.get('db');
    const result = await orderService.deleteOrder(db, id, c.env, c.executionCtx);

    if (result.error) {
      return jsonError(c, result.error.code, result.error.message);
    }

    return c.json(result.data);
  } catch (error: any) {
    const errorId = crypto.randomUUID().split('-')[0];
    const db = c.get('db');
    logger.error(`Erro ao excluir pedido [${errorId}]`, error, { id: c.req.param('id') });

    const logPromise = logSystemEvent(db, c.env, 'error', `Erro Exclusão Pedido [${errorId}]: ${error.message}`, {
      orderId: c.req.param('id'),
      errorId
    }, error, c.executionCtx).catch(err => logger.error('Falha ao logar erro de exclusão de pedido no banco', err));

    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(logPromise);
    }

    return jsonError(c, 500, 'Erro ao remover o pedido.', { errorId });
  }
});

export default router;
