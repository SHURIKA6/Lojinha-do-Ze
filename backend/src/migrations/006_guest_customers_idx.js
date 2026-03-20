export const id = '006_guest_customers_idx';

export async function up(client) {
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_guest_customers 
    ON orders(customer_name, customer_phone, address, id, created_at) 
    WHERE customer_id IS NULL;
  `);
}
