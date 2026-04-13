import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { orderCreateSchema } from '../../core/domain/schemas';
import { orderLimiter } from '../../core/middleware/rateLimit';
import { cleanOptionalString, normalizePhoneDigits } from '../../core/utils/normalize';
import { jsonError, setNoStore, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../core/domain/constants';
import { Bindings, Variables } from '../../core/types';
import * as orderService from '../orders/service';
import * as productService from './service';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

router.get('/', async (c) => {
  const db = c.get('db');
  const limitQuery = c.req.query('limit');
  const offsetQuery = c.req.query('offset');
  const limit = Math.min(parseInt(limitQuery || '') || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);
  const search = c.req.query('search')?.trim();
  const category = c.req.query('category')?.trim();

  try {
    const response = await productService.getCatalog(db, {
      search,
      category,
      limit,
      offset,
    });

    setNoStore(c as any);
    return c.json(response);
  } catch (error) {
    logger.error('Erro ao carregar catálogo', error as Error);
    return jsonError(c, 500, 'Erro ao carregar o catálogo de produtos.');
  }
});

router.post(
  '/orders',
  orderLimiter,
  zValidator('json', orderCreateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const payload = c.req.valid('json') as any;
    const authUser = c.get('user');

    try {
      const order = await orderService.createOrder(db, payload, authUser ?? null, c.env);
      return c.json(
        {
          order,
          message: `Pedido #${order.id} criado com sucesso!`,
        },
        201
      );
    } catch (error: any) {
      if (error.message.includes('não encontrado') ||
          error.message.includes('insuficiente') ||
          error.message.includes('não corresponde')) {
        return jsonError(c, 400, error.message);
      }
      logger.error('Erro ao processar pedido no catálogo (POST)', error as Error);
      return jsonError(c, 500, 'Erro ao processar o seu pedido. Tente novamente em instantes.');
    }
  }
);

export default router;
