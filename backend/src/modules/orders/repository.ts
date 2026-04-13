import { Database } from '../../core/types';

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  items: EnrichedOrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  delivery_type: string;
  address: string;
  payment_method: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
  payment_id?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface EnrichedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderCreateData {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  items: EnrichedOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: string;
  address: string;
  paymentMethod: string;
  notes: string;
}

export async function findOrders(
  client: Database,
  { userId, status, limit, offset }: { userId?: string; status?: string; limit: number; offset: number }
) {
  if (userId) {
    const { rows } = await client.query(
      `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at
       FROM orders
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }

  const params: (string | number | boolean | null)[] = [];
  let query = `
    SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at
    FROM orders
  `;
  if (status) {
    params.push(status);
    query += ` WHERE status = $1`;
  }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const { rows } = await client.query(query, [...params, limit, offset]);
  return rows;
}

export async function findOrderByIdForUpdate(client: Database, id: string) {
  const { rows } = await client.query(
    `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at, payment_id
     FROM orders
     WHERE id = $1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

export async function updateOrderStatus(client: Database, id: string, status: string) {
  const { rows } = await client.query(
    `UPDATE orders
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at`,
    [status, id]
  );
  return rows[0] || null;
}

export async function deleteOrder(client: Database, id: string) {
  await client.query('DELETE FROM orders WHERE id = $1', [id]);
}

export async function restoreProductStock(
  client: Database,
  productId: string,
  quantity: number,
  productName: string,
  reason: string
) {
  await client.query(
    `UPDATE products
     SET quantity = quantity + $1, updated_at = NOW()
     WHERE id = $2`,
    [quantity, productId]
  );

  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     VALUES ($1, $2, 'entrada', $3, $4, NOW())`,
    [productId, productName, quantity, reason]
  );
}

export async function createTransaction(
  client: Database,
  { type, category, description, value, orderId }: { type: string; category: string; description: string; value: number; orderId: string }
) {
  await client.query(
    `INSERT INTO transactions (type, category, description, value, date, order_id)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [type, category, description, value, orderId]
  );
}

export async function restoreProductStockBulk(
  client: Database,
  productIds: number[],
  quantities: number[],
  names: string[],
  reason: string
) {
  await client.query(
    `UPDATE products AS p
     SET quantity = p.quantity + u.qty, updated_at = NOW()
     FROM unnest($1::int[], $2::int[]) AS u(id, qty)
     WHERE p.id = u.id`,
    [productIds, quantities]
  );

  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     SELECT u.id, u.name, 'entrada', u.qty, $1, NOW()
     FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
    [reason, productIds, names, quantities]
  );
}

export async function findProductsByIds(client: Database, ids: number[]) {
  const { rows } = await client.query(
    `SELECT id, name, sale_price, quantity
     FROM products
     WHERE id = ANY($1) AND is_active = TRUE
     FOR UPDATE`,
    [ids]
  );
  return rows;
}

export async function createOrder(client: Database, data: OrderCreateData) {
  const { rows } = await client.query(
    `INSERT INTO orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, delivery_type, address, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, total, status, delivery_type, address, payment_method, notes, created_at, updated_at`,
    [
      data.customerId,
      data.customerName,
      data.customerPhone,
      JSON.stringify(data.items),
      data.subtotal,
      data.deliveryFee,
      data.total,
      data.deliveryType,
      data.address,
      data.paymentMethod,
      data.notes,
    ]
  );
  return rows[0];
}

export async function updateStock(client: Database, productIds: number[], quantities: number[]) {
  const { rowCount } = await client.query(
    `UPDATE products AS p
     SET quantity = p.quantity - u.qty, updated_at = NOW()
     FROM unnest($1::int[], $2::int[]) AS u(id, qty)
     WHERE p.id = u.id AND p.quantity >= u.qty
     RETURNING p.id`,
    [productIds, quantities]
  );
  return rowCount;
}

export async function logInventory(client: Database, productIds: number[], names: string[], quantities: number[], reason: string) {
  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     SELECT u.id, u.name, 'saida', u.qty, $1, NOW()
     FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
    [reason, productIds, names, quantities]
  );
}
