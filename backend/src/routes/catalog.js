import { Hono } from 'hono';
import pool from '../db.js';
const router = new Hono();

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
    console.error('Catalog GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/orders — Public, create order (guest checkout)
router.post('/orders', async (c) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_name, customer_phone, items, notes } = await c.req.json();

    if (!customer_name || !customer_phone || !items || items.length === 0) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Nome, telefone e itens são obrigatórios' }, 400);
    }

    // Calculate total and validate stock
    let total = 0;
    const enrichedItems = [];
    
    // First loop: check product existence and calculate totals, without updating.
    for (const item of items) {
      const parsedQtd = parseInt(item.quantity, 10);
      if (isNaN(parsedQtd) || parsedQtd <= 0) {
        await client.query('ROLLBACK');
        return c.json({ error: `Quantidade inválida para um dos itens` }, 400);
      }

      const { rows } = await client.query('SELECT id, name, sale_price, quantity FROM products WHERE id = $1', [item.productId]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return c.json({ error: `Produto ID ${item.productId} não encontrado` }, 400);
      }
      const product = rows[0];
      
      const subtotal = parseFloat(product.sale_price) * parsedQtd;
      total += subtotal;
      enrichedItems.push({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.sale_price),
        quantity: parsedQtd,
        subtotal,
      });
    }

    // Create order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_name, customer_phone, items, total, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customer_name, customer_phone, JSON.stringify(enrichedItems), total, notes || '']
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



