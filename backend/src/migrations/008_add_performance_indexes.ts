export const id = '008_add_performance_indexes';

export async function up(client: any) {
  await client.query(`
    -- Índices para tabela de produtos (consultas frequentes)
    CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('portuguese', name));
    CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(sale_price) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_products_stock_low ON products(quantity, min_stock) WHERE quantity <= min_stock;
    CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier) WHERE supplier IS NOT NULL;
    
    -- Índices para tabela de pedidos (dashboard e relatórios)
    CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_active ON orders(customer_id, status) WHERE status NOT IN ('cancelado', 'concluido');
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_total_range ON orders(total) WHERE total > 0;
    
    -- Índices para tabela de transações (relatórios financeiros)
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_value_range ON transactions(value) WHERE value > 0;
    CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id) WHERE order_id IS NOT NULL;
    
    -- Índices para tabela de usuários (autenticação e busca)
    CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE email IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_phone_active ON users(phone) WHERE phone IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_name_search ON users USING gin(to_tsvector('portuguese', name));
    
    -- Índices para tabela de sessões (autenticação)
    CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, expires_at) WHERE expires_at > NOW();
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    
    -- Índices para tabela de refresh tokens
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON refresh_tokens(user_id, expires_at) WHERE expires_at > NOW() AND revoked_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
    
    -- Índices para tabela de log de inventário
    CREATE INDEX IF NOT EXISTS idx_inventory_log_product_date ON inventory_log(product_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_inventory_log_type_date ON inventory_log(type, date DESC);
    
    -- Índices para tabela de tokens de configuração de senha
    CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user ON password_setup_tokens(user_id, expires_at) WHERE consumed_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_hash ON password_setup_tokens(token_hash) WHERE consumed_at IS NULL;
    
    -- Índices compostos para consultas complexas do dashboard
    CREATE INDEX IF NOT EXISTS idx_orders_dashboard ON orders(status, created_at DESC, total);
    CREATE INDEX IF NOT EXISTS idx_transactions_dashboard ON transactions(type, date DESC, value);
    CREATE INDEX IF NOT EXISTS idx_products_dashboard ON products(category, is_active, quantity, min_stock);
    
    -- Índices para busca de texto completo
    CREATE INDEX IF NOT EXISTS idx_products_fulltext ON products USING gin(
      to_tsvector('portuguese', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, ''))
    );
    
    -- Índices para paginação eficiente
    CREATE INDEX IF NOT EXISTS idx_products_pagination ON products(created_at DESC, id) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_orders_pagination ON orders(created_at DESC, id);
    CREATE INDEX IF NOT EXISTS idx_transactions_pagination ON transactions(date DESC, id);
    
    -- Índices para relatórios de período
    CREATE INDEX IF NOT EXISTS idx_orders_period ON orders(DATE_TRUNC('day', created_at), status);
    CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(DATE_TRUNC('day', date), type);
    
    -- Índices para filtros de faixa de preço
    CREATE INDEX IF NOT EXISTS idx_products_price_filter ON products(sale_price, category) WHERE is_active = TRUE;
    
    -- Índices para consultas de estoque baixo
    CREATE INDEX IF NOT EXISTS idx_products_low_stock_alert ON products(quantity, min_stock, name) 
    WHERE is_active = TRUE AND quantity <= min_stock;
  `);
}
