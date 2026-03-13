import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware, csrfMiddleware } from '../middleware/auth.js';
import { orderStatusSchema } from '../domain/schemas.js';
import { jsonError } from '../utils/http.js';

const router = new Hono();

function parseOrderItems(items) {
  if (Array.isArray(items)) return items;

  try {
    return JSON.parse(items || '[]');
  } catch {
    return [];
  }
}

async function restoreOrderStock(client, order) {
  const items = parseOrderItems(order.items);

  for (const item of items) {
    await client.query(
      'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
      [item.quantity, item.productId]
    );
    await client.query(
      `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
       VALUES ($1, $2, 'entrada', $3, $4, NOW())`,
      [item.productId, item.name, item.quantity, `Estorno do pedido #${order.id}`]
    );
  }
}

function validationError(result, c) {
  if (!result.success) {
    return jsonError(c, 400, result.error.issues[0].message);
  }

  return undefined;
}

router.get('/', authMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user');
    const status = c.req.query('status');

    if (user.role === 'customer') {
      const { rows } = await db.query(
        `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at
         FROM orders
         WHERE customer_id = $1
         ORDER BY created_at DESC`,
        [user.id]
      );
      return c.json(rows);
    }

    const params = [];
    let query = `
      SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at
      FROM orders
    `;
    if (status) {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);
    return c.json(rows);
  } catch (error) {
    console.error('Orders GET error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.patch(
  '/:id/status',
  authMiddleware,
  adminOnly,
  csrfMiddleware,
  zValidator('json', orderStatusSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const id = c.req.param('id');
      const { status } = c.req.valid('json');
      const { rows: currentRows } = await client.query(
        `SELECT *
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (!currentRows.length) {
        await client.query('ROLLBACK');
        return jsonError(c, 404, 'Pedido não encontrado');
      }

      const currentOrder = currentRows[0];
      if (
        status === 'cancelado' &&
        currentOrder.status !== 'cancelado' &&
        currentOrder.status !== 'concluido'
      ) {
        await restoreOrderStock(client, currentOrder);
      }

      const { rows } = await client.query(
        `UPDATE orders
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at`,
        [status, id]
      );

      await client.query('COMMIT');
      return c.json(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Orders PATCH error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    } finally {
      client.release();
    }
  }
);

router.delete('/:id', authMiddleware, adminOnly, csrfMiddleware, async (c) => {
  const db = c.get('db');
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const id = c.req.param('id');
    const { rows } = await client.query(
      `SELECT *
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return jsonError(c, 404, 'Pedido não encontrado');
    }

    const order = rows[0];
    if (order.status !== 'cancelado' && order.status !== 'concluido') {
      await restoreOrderStock(client, order);
    }

    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    await client.query('COMMIT');
    return c.json({ message: 'Pedido excluído' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Orders DELETE error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  } finally {
    client.release();
  }
});

export default router;
