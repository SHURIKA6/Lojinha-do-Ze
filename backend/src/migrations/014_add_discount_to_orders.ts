export const id = '014_add_discount_to_orders';

export async function up(client: any): Promise<void> {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
  `);
}
