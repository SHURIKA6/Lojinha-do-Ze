import { Hono } from 'hono';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const router = new Hono();

function parseOrderItems(items) {
  if (Array.isArray(items)) return items;

  try {
    return JSON.parse(items || '[]');
  } catch (err) {
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

const statusSchema = z.object({
  status: z.enum(['novo', 'recebido', 'em_preparo', 'saiu_entrega', 'concluido', 'cancelado'])
});

// GET /api/orders — list all orders (adm) or user orders (customer)
router.get('/', authMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user');
    const status = c.req.query('status');
    
    if (user.role === 'customer') {
      const { rows } = await db.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [user.id]);
      return c.json(rows);
    }

    // Admin logic
    let query = 'SELECT * FROM orders';
    const params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    return c.json(rows);
  } catch (err) {
    console.error('Orders GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', authMiddleware, adminOnly, zValidator('json', statusSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  const db = c.get('db');
  let client;
  try {
    client = await db.connect();
    const id = c.req.param('id');
    const { status } = c.req.valid('json');
    await client.query('BEGIN');

    const { rows: currentRows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (currentRows.length === 0) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Pedido não encontrado' }, 404);
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
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    await client.query('COMMIT');
    if (rows.length === 0) return c.json({ error: 'Pedido não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Orders PATCH error:', err.message);
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  } finally {
    client?.release();
  }
});

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const db = c.get('db');
  let client;
  try {
    client = await db.connect();
    const id = c.req.param('id');
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Pedido não encontrado' }, 404);
    }

    const order = rows[0];
    if (order.status !== 'cancelado' && order.status !== 'concluido') {
      await restoreOrderStock(client, order);
    }

    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    await client.query('COMMIT');
    return c.json({ message: 'Pedido excluído' });
  } catch (err) {
    console.error('Orders DELETE error:', err.message);
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  } finally {
    client?.release();
  }
});

export default router;


