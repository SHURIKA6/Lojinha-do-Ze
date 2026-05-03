export const id = '006_guest_customers_idx';

/**
 * Adiciona índice para pedidos de clientes convidados (guest).
 * Cria um índice composto em pedidos de clientes convidados (onde customer_id IS NULL)
 * para melhorar a performance de busca por nome do cliente, telefone, endereço, id e created_at.
 *
 * Operações SQL:
 * - CREATE INDEX idx_orders_guest_customers ON orders(customer_name, customer_phone, address, id, created_at)
 *   WHERE customer_id IS NULL (índice parcial para clientes convidados)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_guest_customers 
    ON orders(customer_name, customer_phone, address, id, created_at) 
    WHERE customer_id IS NULL;
  `);
}
