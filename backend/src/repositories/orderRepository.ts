import { PoolClient } from 'pg';

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

export class OrderRepository {
  async findProductsByIds(client: PoolClient, ids: number[]) {
    const { rows } = await client.query(
      `SELECT id, name, sale_price, quantity
       FROM products
       WHERE id = ANY($1) AND is_active = TRUE
       FOR UPDATE`,
      [ids]
    );
    return rows;
  }

  async createOrder(client: PoolClient, data: OrderCreateData) {
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

  async updateStock(client: PoolClient, productIds: number[], quantities: number[]) {
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

  async logInventory(client: PoolClient, productIds: number[], names: string[], quantities: number[], reason: string) {
    await client.query(
      `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
       SELECT u.id, u.name, 'saida', u.qty, $1, NOW()
       FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
      [reason, productIds, names, quantities]
    );
  }
}

export const orderRepository = new OrderRepository();
