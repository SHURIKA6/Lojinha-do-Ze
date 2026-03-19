import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { csrfMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { orderCreateSchema } from '../domain/schemas.js';
import { orderLimiter } from '../middleware/rateLimit.js';
import { cleanOptionalString, normalizePhoneDigits } from '../utils/normalize.js';
import { jsonError, validationError } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { cacheService } from '../services/cacheService.js';
import { CATALOG_CACHE_TTL_SECONDS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../domain/constants.js';

const router = new Hono();

function mergeOrderItems(items) {
  const merged = new Map();

  for (const item of items) {
    const current = merged.get(item.productId) || 0;
    merged.set(item.productId, current + item.quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

router.get('/', async (c) => {
  const db = c.get('db');
  const limit = Math.min(parseInt(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);
  const search = c.req.query('search')?.trim();
  const category = c.req.query('category')?.trim();

  const cacheKey = `catalog_${limit}_${offset}_${search || ''}_${category || ''}`;

  const cached = cacheService.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

    const whereClauses = ['is_active = TRUE', 'quantity > 0'];
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search}%`);
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

    const categories = {};
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

      const payload = c.req.valid('json');
      const authUser = c.get('user');
      const normalizedRequestPhone = normalizePhoneDigits(payload.customer_phone);
      const mergedItems = mergeOrderItems(payload.items);
      const deliveryFee = payload.delivery_type === 'entrega' ? 5 : 0;

      let subtotal = 0;
      const enrichedItems = [];

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

      let customerId = null;
      if (authUser?.role === 'customer') {
        const normalizedUserPhone = normalizePhoneDigits(authUser.phone);
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

      for (const item of enrichedItems) {
        const { rowCount } = await client.query(
          `UPDATE products
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE id = $2 AND quantity >= $1`,
          [item.quantity, item.productId]
        );

        if (!rowCount) {
          await client.query('ROLLBACK');
          return jsonError(c, 400, `Estoque insuficiente ou concorrente para ${item.name}`);
        }

        await client.query(
          `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
           VALUES ($1, $2, 'saida', $3, $4, NOW())`,
          [item.productId, item.name, item.quantity, `Pedido #${orderRows[0].id}`]
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
      logger.error('Erro ao processar pedido no catálogo (POST)', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    } finally {
      client.release();
    }
  }
);

export default router;
