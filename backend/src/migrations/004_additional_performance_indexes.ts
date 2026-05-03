export const id = '004_additional_performance_indexes';

/**
 * Migração para adicionar índices de performance adicionais (Fase 2).
 * Cria índices para ordenação de produtos ativos, filtragem de status de pedidos,
 * filtragem de categoria de transações e consultas de log de inventário.
 *
 * Operações SQL:
 * - CREATE INDEX idx_products_active_name ON products(is_active, name) WHERE is_active = TRUE (índice parcial)
 * - CREATE INDEX idx_orders_status ON orders(status)
 * - CREATE INDEX idx_transactions_category ON transactions(category)
 * - CREATE INDEX idx_inventory_log_product_date ON inventory_log(product_id, date DESC)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    -- Index for active products with name for catalog sorting
    CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(is_active, name) WHERE is_active = TRUE;

    -- Index for order status to speed up admin dashboard filtering
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- Index for transaction categories
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    
    -- Index for inventory log by product and date
    CREATE INDEX IF NOT EXISTS idx_inventory_log_product_date ON inventory_log(product_id, date DESC);
  `);
}
