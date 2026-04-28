export const id = '009_add_tracking_to_orders';

export async function up(client: any): Promise<void> {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
  `);
}
