import { neon } from '@neondatabase/serverless';

export const name = '008_add_performance_indexes';

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
