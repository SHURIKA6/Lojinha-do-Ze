import { neon } from '@neondatabase/serverless';

export const id = '008_add_performance_indexes';

/**
 * Migração para adicionar índices de performance (Fase 3).
 * Cria índices para as tabelas customers, products, orders e inventory_logs
 * para otimizar padrões comuns de consulta. Ajusta nomes de tabelas para corresponderem aos padrões do projeto.
 * Remove NOW() de índices parciais pois não é imutável no Postgres.
 *
 * Operações SQL:
 * - CREATE INDEX idx_customers_email_full ON customers(email)
 * - CREATE INDEX idx_customers_phone_full ON customers(phone)
 * - CREATE INDEX idx_customers_name_full ON customers(name)
 * - CREATE INDEX idx_products_category_status ON products(category, status)
 * - CREATE INDEX idx_products_slug ON products(slug)
 * - CREATE INDEX idx_orders_customer_id ON orders(customer_id)
 * - CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC)
 * - CREATE INDEX idx_orders_token ON orders(token) WHERE token IS NOT NULL (índice parcial)
 * - CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id)
 * - CREATE INDEX idx_inventory_logs_type_created ON inventory_logs(type, created_at DESC)
 *
 * @param sql - Função de consulta SQL serverless do Neon
 */
export async function up(sql: ReturnType<typeof neon>) {
  // Ajuste nos nomes das tabelas para o padrão atual do projeto (plural)
  // E remoção de NOW() em índices parciais (não permitido no Postgres pois não é imutável)
  await (sql as any)(`
    -- Índices para Customers
    CREATE INDEX IF NOT EXISTS idx_customers_email_full ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_phone_full ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name_full ON customers(name);
    
    -- Índices para Products
    CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category, status);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

    -- Índices para Orders
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(token) WHERE token IS NOT NULL;

    -- Índices para Inventory Logs
    CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_logs_type_created ON inventory_logs(type, created_at DESC);
  `);
}
