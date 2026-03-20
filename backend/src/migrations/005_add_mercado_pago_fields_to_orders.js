export const id = '005_add_mercado_pago_fields_to_orders';

export async function up(client) {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
  `);
}
