import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import pool from '../db.js';
import { orderLimiter } from '../middleware/rateLimit.js';

const router = new Hono();

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive('ID de produto inválido'),
  quantity: z.coerce.number().int().positive('Quantidade deve ser maior que zero')
});

const orderSchema = z.object({
  customer_name: z.string().min(2, 'Nome é obrigatório'),
  customer_phone: z.string().min(8, 'Telefone inválido'),
  notes: z.string().optional(),
  delivery_type: z.enum(['entrega', 'retirada']).default('entrega'),
  address: z.string().optional(),
  payment_method: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Pedido deve conter ao menos 1 item')
});

// GET /api/catalog — Public, no auth required
router.get('/', async (c) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, code, name, description, photo, category, sale_price, quantity FROM products WHERE quantity > 0 ORDER BY category, name'
    );

    // Group by category
    const categories = {};
    rows.forEach(p => {
      if (!categories[p.category]) {
        categories[p.category] = { name: p.category, products: [] };
      }
      categories[p.category].products.push(p);
    });

    return c.json({
      categories: Object.values(categories),
      total: rows.length,
    });
  } catch (err) {
    console.error('Catalog GET error:', err.message, err.stack);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/orders — Public, create order (guest checkout)
router.post('/orders', orderLimiter, zValidator('json', orderSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_name, customer_phone, items, notes, delivery_type, address, payment_method } = c.req.valid('json');

    // Calculate total and validate stock
    let subtotal = 0;
    const delivery_fee = delivery_type === 'entrega' ? 5.00 : 0; // Taxa fixa simbólica de 5 reais por enquanto
    const enrichedItems = [];
    
    // First loop: check product existence and calculate totals, without updating.
    for (const item of items) {
      const parsedQtd = item.quantity;

      const { rows } = await client.query('SELECT id, name, sale_price, quantity FROM products WHERE id = $1', [item.productId]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return c.json({ error: `Produto ID ${item.productId} não encontrado` }, 400);
      }
      const product = rows[0];
      
      const itemSubtotal = parseFloat(product.sale_price) * parsedQtd;
      subtotal += itemSubtotal;
      enrichedItems.push({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.sale_price),
        quantity: parsedQtd,
        subtotal: itemSubtotal,
      });
    }

    const total = subtotal + delivery_fee;

    const { rows: userFind } = await client.query('SELECT id FROM users WHERE phone = $1', [customer_phone]);
    const customer_id = userFind.length > 0 ? userFind[0].id : null;

    // Create order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, delivery_type, address, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [customer_id, customer_name, customer_phone, JSON.stringify(enrichedItems), subtotal, delivery_fee, total, delivery_type, address || '', payment_method || '', notes || '']
    );

    // Deduct stock for each item using atomic operations to prevent Race Conditions
    for (const item of enrichedItems) {
      const { rowCount } = await client.query(
        'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2 AND quantity >= $1',
        [item.quantity, item.productId]
      );
      
      if (rowCount === 0) {
         await client.query('ROLLBACK');
         return c.json({ error: `Estoque insuficiente ou concorrente para ${item.name}` }, 400);
      }

      await client.query(
        `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
         VALUES ($1, $2, 'saida', $3, $4, NOW())`,
        [item.productId, item.name, item.quantity, `Pedido #${orderRows[0].id}`]
      );
    }

    await client.query('COMMIT');

    return c.json({
      order: orderRows[0],
      message: `Pedido #${orderRows[0].id} criado com sucesso!`,
    }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Catalog Orders POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  } finally {
    client.release();
  }
});

export default router;



