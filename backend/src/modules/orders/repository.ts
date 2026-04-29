import { Database } from '../../core/types';
import { logger } from '../../core/utils/logger';

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
  tracking_code: string | null;
  delivery_type: string;
  address: string;
  payment_method: string;
  notes: string;
  discount: number;
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
  discount: number;
}

export async function findOrders(
  client: Database,
  { userId, status, limit, offset }: { userId?: string; status?: string; limit: number; offset: number }
) {
  if (userId) {
    try {
      const { rows } = await client.query(
        `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at
         FROM orders
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return rows.map((row: any) => ({
        ...row,
        subtotal: parseFloat(row.subtotal),
        delivery_fee: parseFloat(row.delivery_fee),
        discount: parseFloat(row.discount),
        total: parseFloat(row.total),
      }));
    } catch (error) {
      logger.error('Erro na query findOrders (user)', error as Error, { userId, limit, offset });
      throw error;
    }
  }

  const params: (string | number | boolean | null)[] = [];
  let query = `
    SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at
    FROM orders
  `;
  if (status) {
    params.push(status);
    query += ` WHERE status = $1`;
  }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  try {
    const { rows } = await client.query(query, [...params, limit, offset]);
    return rows.map((row: any) => ({
      ...row,
      subtotal: parseFloat(row.subtotal),
      delivery_fee: parseFloat(row.delivery_fee),
      discount: parseFloat(row.discount),
      total: parseFloat(row.total),
    }));
  } catch (error) {
    logger.error('Erro na query findOrders', error as Error, { query, params: [...params, limit, offset] });
    throw error;
  }
}

export async function findOrderByIdForUpdate(client: Database, id: string) {
  const { rows } = await client.query(
    `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at, payment_id
     FROM orders
     WHERE id = $1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

export async function updateOrderStatus(client: Database, id: string, status: string, trackingCode?: string) {
  let query = `UPDATE orders SET status = $1, updated_at = NOW()`;
  const params: any[] = [status, id];
  
  if (trackingCode !== undefined) {
    query += `, tracking_code = $3`;
    params.push(trackingCode);
  }
  
  query += ` WHERE id = $2 RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at`;

  const { rows } = await client.query(query, params);
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
    `INSERT INTO orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, delivery_type, address, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, delivery_type, address, payment_method, notes, created_at, updated_at`,
    [
      data.customerId,
      data.customerName,
      data.customerPhone,
      JSON.stringify(data.items),
      data.subtotal,
      data.deliveryFee,
      data.discount,
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
  const { rows } = await client.query(
    `UPDATE products AS p
     SET quantity = p.quantity - u.qty, updated_at = NOW()
     FROM unnest($1::int[], $2::int[]) AS u(id, qty)
     WHERE p.id = u.id AND p.quantity >= u.qty
     RETURNING p.id, p.name, p.quantity, p.min_stock`,
    [productIds, quantities]
  );
  return rows;
}

export async function logInventory(client: Database, productIds: number[], names: string[], quantities: number[], reason: string) {
  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     SELECT u.id, u.name, 'saida', u.qty, $1, NOW()
     FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
    [reason, productIds, names, quantities]
  );
}
