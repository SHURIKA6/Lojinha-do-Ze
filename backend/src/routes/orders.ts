import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware } from '../middleware/auth';
import { orderStatusSchema } from '../domain/schemas';
import { ORDER_STATUS_VALUES } from '../domain/constants';
import { jsonError, setNoStore, validationError } from '../utils/http';
import { isValidId } from '../utils/normalize';
import { MercadoPagoService } from '../services/mercadoPagoService';
import { getRequiredEnv } from '../load-local-env';
import { logger } from '../utils/logger';
import { Bindings, Variables, Database } from '../types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function restoreOrderStock(client: any, order: any) {
  const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');

  for (const item of items) {
    await client.query(
      `UPDATE products 
       SET quantity = quantity + $1, updated_at = NOW() 
       WHERE id = $2`,
      [item.quantity, item.productId]
    );

    await client.query(
      `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
       VALUES ($1, $2, 'entrada', $3, $4, NOW())`,
      [item.productId, item.name, item.quantity, `Cancelamento ou Exclusão do Pedido #${order.id}`]
    );
  }
}

function shouldRestoreOrderStock(order: any) {
  return order.payment_method !== 'pix' || order.payment_status === 'approved';
}

router.get('/', authMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user');
    const statusQuery = c.req.query('status');
    const limitQuery = c.req.query('limit');
    const offsetQuery = c.req.query('offset');
    const limit = Math.min(parseInt(limitQuery || '') || 50, 100);
    const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);

    if (statusQuery && !ORDER_STATUS_VALUES.includes(statusQuery as any)) {
      setNoStore(c as any);
      return jsonError(c, 400, 'Status inválido');
    }

    if (user?.role === 'customer') {
      const { rows } = await db.query(
        `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at
         FROM orders
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [user.id, limit, offset]
      );
      setNoStore(c as any);
      return c.json(rows);
    }

    const params: any[] = [];
    let query = `
      SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at
      FROM orders
    `;
    if (statusQuery) {
      params.push(statusQuery);
      query += ` WHERE status = $1`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const { rows } = await db.query(query, [...params, limit, offset]);
    setNoStore(c as any);
    return c.json(rows);
  } catch (error) {
    logger.error('Erro no GET de Pedidos', error as Error);
    return jsonError(c, 500, 'Erro ao carregar a lista de pedidos.');
  }
});

router.patch(
  '/:id/status',
  authMiddleware,
  adminOnly,
  zValidator('json', orderStatusSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');
      const { status } = c.req.valid('json');
      const { rows: currentRows } = await client.query(
        `SELECT id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, payment_id, payment_method, payment_status, delivery_type, address, notes
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
        currentOrder.status !== 'concluido' &&
        shouldRestoreOrderStock(currentOrder)
      ) {
        await restoreOrderStock(client, currentOrder);

        if (currentOrder.payment_id) {
          try {
            const token = getRequiredEnv(c, 'MERCADO_PAGO_ACCESS_TOKEN');
            const mpService = new MercadoPagoService(token);
            await mpService.cancelPayment(currentOrder.payment_id);
            logger.info(`Pagamento ${currentOrder.payment_id} cancelado no Mercado Pago`);
          } catch (mpError) {
            logger.error('Erro ao cancelar no Mercado Pago', mpError as Error, {
              paymentId: currentOrder.payment_id,
            });
          }
        }
      }

      if (
        status === 'concluido' &&
        currentOrder.status !== 'concluido' &&
        !(currentOrder.payment_method === 'pix' && currentOrder.payment_status === 'approved')
      ) {
        await client.query(
          `INSERT INTO transactions (type, category, description, value, date, order_id)
           VALUES ($1, $2, $3, $4, NOW(), $5)`,
          [
            'receita',
            'Venda de produtos',
            `Pedido #${id} - ${currentOrder.customer_name}`,
            currentOrder.total,
            id,
          ]
        );
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
      logger.error('Erro no PATCH de Pedidos', error as Error, { id: c.req.param('id') });
      return jsonError(c, 500, 'Erro ao buscar os detalhes do pedido.');
    } finally {
      if (client.release) client.release();
    }
  }
);

router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const db = c.get('db');
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const id = c.req.param('id');
    if (!isValidId(id)) {
      return jsonError(c, 400, 'ID inválido');
    }
    const { rows } = await client.query(
      `SELECT id, customer_name, items, status, payment_id, payment_method, payment_status
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
    if (
      order.status !== 'cancelado' &&
      order.status !== 'concluido' &&
      shouldRestoreOrderStock(order)
    ) {
      await restoreOrderStock(client, order);
    }

    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    await client.query('COMMIT');
    return c.json({ message: 'Pedido excluído' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Erro no DELETE de Pedidos', error as Error, { id: c.req.param('id') });
    return jsonError(c, 500, 'Erro ao modificar o status do pedido.');
  } finally {
    if (client.release) client.release();
  }
});

export default router;
