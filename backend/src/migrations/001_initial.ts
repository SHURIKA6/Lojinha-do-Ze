export const id = '001_initial';

/**
 * Migração inicial do esquema do banco de dados.
 * Cria as tabelas principais para o sistema de e-commerce incluindo users, products, orders,
 * transactions, inventory_log, auth_sessions, password_setup_tokens e schema_migrations.
 * Também cria índices de performance iniciais para colunas consultadas frequentemente.
 *
 * Operações SQL:
 * - CREATE TABLE users (id, name, email, password, role, phone, cpf, address, notes, avatar, timestamps)
 * - CREATE TABLE products (id, code, name, description, photo, category, quantity, prices, supplier, is_active, timestamps)
 * - CREATE TABLE orders (id, customer info, items JSONB, totals, status, delivery info, payment, timestamps)
 * - CREATE TABLE transactions (id, type, category, description, value, date, order_id, created_at)
 * - CREATE TABLE inventory_log (id, product_id, product_name, type, quantity, reason, date)
 * - CREATE TABLE auth_sessions (id, user_id, token_hash, csrf_token, ip_address, user_agent, timestamps, expires_at)
 * - CREATE TABLE password_setup_tokens (id, user_id, token_hash, setup_code, created_at, expires_at, consumed_at)
 * - CREATE TABLE schema_migrations (id, applied_at)
 * - CREATE INDEX para orders (status, created_at), customer_id, transactions (type, date), auth_sessions (user_id, expires_at)
 * - CREATE INDEX para password_setup_tokens (user_id, expires_at)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      is_temporary_password BOOLEAN DEFAULT false,
      role VARCHAR(20) NOT NULL DEFAULT 'customer',
      phone VARCHAR(30) UNIQUE,
      cpf VARCHAR(20),
      address TEXT,
      notes TEXT,
      avatar VARCHAR(5),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_temporary_password BOOLEAN DEFAULT false;

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      photo TEXT,
      category VARCHAR(100),
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      cost_price DECIMAL(10,2) DEFAULT 0,
      sale_price DECIMAL(10,2) DEFAULT 0,
      supplier VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS photo TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(30) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      subtotal DECIMAL(10,2) DEFAULT 0,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(30) DEFAULT 'recebido',
      delivery_type VARCHAR(50) DEFAULT 'entrega',
      address TEXT,
      payment_method VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'entrega';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      value DECIMAL(10,2) DEFAULT 0,
      date TIMESTAMP DEFAULT NOW(),
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_log (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255),
      type VARCHAR(20),
      quantity INTEGER,
      reason TEXT,
      date TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      csrf_token VARCHAR(128) NOT NULL,
      ip_address VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_seen_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_setup_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      setup_code VARCHAR(16) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      consumed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(64) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    UPDATE products
    SET is_active = CASE WHEN quantity > 0 THEN true ELSE false END
    WHERE is_active IS DISTINCT FROM CASE WHEN quantity > 0 THEN true ELSE false END;

    CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
      ON orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id
      ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date
      ON transactions(type, date DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
      ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
      ON auth_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user_id
      ON password_setup_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_expires_at
      ON password_setup_tokens(expires_at);
  `);
}
