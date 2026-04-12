import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { orderCreateSchema } from '../domain/schemas';
import { orderLimiter } from '../middleware/rateLimit';
import { cleanOptionalString, normalizePhoneDigits } from '../utils/normalize';
import { jsonError, validationError } from '../utils/http';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cacheService';
import { CATALOG_CACHE_TTL_SECONDS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../domain/constants';
import { CACHE_PREFIXES } from '../domain/cacheKeys';
import { Bindings, Variables } from '../types';
import { orderService } from '../services/orderService';

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

  const cacheKey = `${CACHE_PREFIXES.CATALOG}${limit}_${offset}_${search || ''}_${category || ''}`;

  const cached = cacheService.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const whereClauses = ['is_active = TRUE', 'quantity > 0'];
  const queryParams: any[] = [];

  if (search) {
    queryParams.push(`%${escapeIlike(search)}%`);
    whereClauses.push(`name ILIKE $${queryParams.length}`);
  }

  if (category) {
    queryParams.push(category);
    whereClauses.push(`category = $${queryParams.length}`);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRes = await db.query(`SELECT COUNT(*) FROM products WHERE ${whereSql}`, queryParams);
  const totalCount = parseInt(countRes.rows[0].count);

  queryParams.push(limit, offset);
  const { rows } = await db.query(
    `SELECT id, code, name, description, photo, category, sale_price, quantity
     FROM products
     WHERE ${whereSql}
     ORDER BY category, name
     LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
    queryParams
  );

  const categories: Record<string, { name: string; products: any[] }> = {};
  for (const product of rows) {
    if (!categories[product.category]) {
      categories[product.category] = {
        name: product.category,
        products: [],
      };
    }
    categories[product.category].products.push(product);
  }

  const response = {
    categories: Object.values(categories),
    total: totalCount,
    limit,
    offset,
  };

  cacheService.set(cacheKey, response, CATALOG_CACHE_TTL_SECONDS);

  return c.json(response);
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
      const order = await orderService.createOrder(db, payload, authUser, c.env);
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
