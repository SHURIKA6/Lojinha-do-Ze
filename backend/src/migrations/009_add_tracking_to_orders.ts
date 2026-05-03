export const id = '009_add_tracking_to_orders';

/**
 * Adiciona a coluna tracking_code à tabela orders para rastreamento de envios.
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
  `);
}
