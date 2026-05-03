export const id = '014_add_discount_to_orders';

/**
 * Adiciona a coluna discount à tabela orders para armazenar valores de desconto dos pedidos.
 * A coluna é DECIMAL(10,2) com valor padrão 0.
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
  `);
}
