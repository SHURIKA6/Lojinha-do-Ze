export const id = '003_add_performance_indexes';

/**
 * Migração para adicionar índices de performance (Fase 1).
 * Cria índices para melhorar a performance de consultas de filtragem do catálogo de produtos,
 * busca de pedidos por telefone do cliente, ordenação de pedidos por data e relatórios de transações.
 *
 * Operações SQL:
 * - CREATE INDEX idx_products_category ON products(category)
 * - CREATE INDEX idx_orders_customer_phone ON orders(customer_phone)
 * - CREATE INDEX idx_orders_created_at ON orders(created_at DESC)
 * - CREATE INDEX idx_transactions_date ON transactions(date DESC)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    -- Index for product category to improve catalog filtering
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

    -- Index for customer phone to improve customer lookup and orders by phone
    CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

    -- Separate index for order creation date for general sorting
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    
    -- Index for transaction date for reporting
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  `);
}
