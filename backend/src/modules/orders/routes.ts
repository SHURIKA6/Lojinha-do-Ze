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
  } catch (error) {
    logger.error('Erro ao buscar pedidos', error as Error, { 
      userId: user?.id, 
      role: user?.role,
      statusQuery,
      limit,
      offset
    });
    return jsonError(c, 500, 'Erro ao carregar a lista de pedidos.');
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

    const result = await orderService.updateOrderStatus(db, id, status, c.env, tracking_code);

    if (result.error) {
      return jsonError(c, result.error.code, result.error.message);
    }

    return c.json(result.data);
  }
);

router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  const db = c.get('db');
  const result = await orderService.deleteOrder(db, id);

  if (result.error) {
    return jsonError(c, result.error.code, result.error.message);
  }

  return c.json(result.data);
});

export default router;
