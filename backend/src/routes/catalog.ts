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

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface OrderItem {
  productId: string;
  quantity: number;
}

interface EnrichedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

function mergeOrderItems(items: OrderItem[]): OrderItem[] {
  const merged = new Map<string, number>();

  for (const item of items) {
    const current = merged.get(item.productId) || 0;
    merged.set(item.productId, current + item.quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

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
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const payload = c.req.valid('json') as any;
      const authUser = c.get('user');
      const normalizedRequestPhone = normalizePhoneDigits(payload.customer_phone);
      const mergedItems = mergeOrderItems(payload.items);
      const deliveryFeeValue = parseFloat(c.env?.DELIVERY_FEE || '5');
      const deliveryFee = payload.delivery_type === 'entrega' ? deliveryFeeValue : 0;

      let subtotal = 0;
      const enrichedItems: EnrichedOrderItem[] = [];

      for (const item of mergedItems) {
        const { rows } = await client.query(
          `SELECT id, name, sale_price, quantity
           FROM products
           WHERE id = $1 AND is_active = TRUE
           FOR UPDATE`,
          [item.productId]
        );

        if (!rows.length) {
          await client.query('ROLLBACK');
          return jsonError(c, 400, `Produto ID ${item.productId} não encontrado`);
        }

        const product = rows[0];
        if (product.quantity < item.quantity) {
          await client.query('ROLLBACK');
          return jsonError(c, 400, `Estoque insuficiente para ${product.name}`);
        }

        const itemSubtotal = parseFloat(product.sale_price) * item.quantity;
        subtotal += itemSubtotal;
        enrichedItems.push({
          productId: product.id,
          name: product.name,
          price: parseFloat(product.sale_price),
          quantity: item.quantity,
          subtotal: itemSubtotal,
        });
      }

      let customerId: string | null = null;
      if (authUser?.role === 'customer') {
        const normalizedUserPhone = normalizePhoneDigits(authUser.phone || '');
        if (!normalizedUserPhone || normalizedUserPhone !== normalizedRequestPhone) {
          await client.query('ROLLBACK');
          return jsonError(c, 400, 'Telefone do pedido não corresponde ao cliente autenticado');
        }
        customerId = authUser.id;
      }

      const total = subtotal + deliveryFee;
      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, delivery_type, address, payment_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at`,
        [
          customerId,
          payload.customer_name.trim(),
          payload.customer_phone.trim(),
          JSON.stringify(enrichedItems),
          subtotal,
          deliveryFee,
          total,
          payload.delivery_type,
          cleanOptionalString(payload.address) || '',
          payload.payment_method,
          cleanOptionalString(payload.notes) || '',
        ]
      );

      if (enrichedItems.length > 0) {
        const productIds = enrichedItems.map((i) => parseInt(i.productId));
        const quantities = enrichedItems.map((i) => i.quantity);
        const names = enrichedItems.map((i) => i.name);

        const { rowCount } = await client.query(
          `UPDATE products AS p
           SET quantity = p.quantity - u.qty, updated_at = NOW()
           FROM unnest($1::int[], $2::int[]) AS u(id, qty)
           WHERE p.id = u.id AND p.quantity >= u.qty
           RETURNING p.id`,
          [productIds, quantities]
        );

        if (rowCount !== enrichedItems.length) {
          await client.query('ROLLBACK');
          return jsonError(c, 400, 'Estoque insuficiente ou concorrente para um dos itens do pedido');
        }

        await client.query(
          `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
           SELECT u.id, u.name, 'saida', u.qty, $1, NOW()
           FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
          [`Pedido #${orderRows[0].id}`, productIds, names, quantities]
        );
      }

      await client.query('COMMIT');
      return c.json(
        {
          order: orderRows[0],
          message: `Pedido #${orderRows[0].id} criado com sucesso!`,
        },
        201
      );
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('Erro ao processar pedido no catálogo (POST)', error as Error);
      return jsonError(c, 500, 'Erro ao processar o seu pedido. Tente novamente em instantes.');
    } finally {
      if (client.release) client.release();
    }
  }
);

export default router;
