export const id = '005_add_mercado_pago_fields_to_orders';

/**
 * Adiciona campos de integração do Mercado Pago à tabela orders.
 * Adiciona as colunas payment_id e payment_status para suportar o processamento de pagamentos do Mercado Pago.
 *
 * Operações SQL:
 * - ALTER TABLE orders ADD COLUMN payment_id VARCHAR(100)
 * - ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
  `);
}
