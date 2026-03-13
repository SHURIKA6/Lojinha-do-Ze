import pool from './db.js';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

// Load .dev.vars for local execution if present
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const devVarsPath = join(__dirname, '..', '.dev.vars');

if (existsSync(devVarsPath)) {
  const content = readFileSync(devVarsPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function createTables() {
  console.log('📦 Criando tabelas...');

  await pool.query(`
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
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

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
  `);

  console.log('✅ Tabelas criadas com sucesso!');
}

async function seedData() {
  // Check if already seeded
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count) > 0) {
    console.log('ℹ️  Banco já possui dados, pulando seed.');
    return;
  }

  console.log('🌱 Inserindo dados de exemplo...');

  const adminPassStr = process.env.ADMIN_PASSWORD;
  const clientPassStr = process.env.CLIENT_PASSWORD;

  if (!adminPassStr) {
    console.warn("⚠️ ADMIN_PASSWORD não fornecido nas variáveis de ambiente. Pulando criação de Administrador.");
  } else {
    const adminPass = await bcrypt.hash(adminPassStr, 10);
    await pool.query(`
      INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, avatar) VALUES
      ('José Silva', 'jose@lojinha.com', $1, false, 'admin', '(11) 99999-1234', NULL, NULL, 'JS')
    `, [adminPass]);
  }

  if (!clientPassStr) {
    console.warn("⚠️ CLIENT_PASSWORD não fornecido nas variáveis de ambiente. Usuários de teste terão senhas aleatórias e temporárias.");
  }

  const getClientPass = async () => {
    if (clientPassStr) return await bcrypt.hash(clientPassStr, 10);
    // Generate a random 12-char secure password for seeds
    return await bcrypt.hash(Math.random().toString(36).substring(2, 14) + '!', 10);
  };

  const c1Pass = await getClientPass();
  const c2Pass = await getClientPass();
  const c3Pass = await getClientPass();
  const c4Pass = await getClientPass();
  const c5Pass = await getClientPass();

  // --- Users ---
  await pool.query(`
    INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, avatar) VALUES
    ('Maria Oliveira', 'maria@email.com', $1, true, 'customer', '(11) 98765-4321', '123.456.789-00', 'Rua das Flores, 123 - São Paulo/SP', 'MO'),
    ('Carlos Santos', 'carlos@email.com', $2, true, 'customer', '(11) 91234-5678', '987.654.321-00', 'Av. Brasil, 456 - São Paulo/SP', 'CS'),
    ('Ana Pereira', 'ana@email.com', $3, true, 'customer', '(21) 99876-5432', '456.789.123-00', 'Rua do Sol, 789 - Rio de Janeiro/RJ', 'AP'),
    ('Roberto Lima', 'roberto@email.com', $4, true, 'customer', '(31) 98765-1234', '321.654.987-00', 'Rua Minas, 321 - Belo Horizonte/MG', 'RL'),
    ('Fernanda Costa', 'fernanda@email.com', $5, true, 'customer', '(41) 99123-4567', '654.321.987-00', 'Av. Paraná, 654 - Curitiba/PR', 'FC')
  `, [c1Pass, c2Pass, c3Pass, c4Pass, c5Pass]);

  // --- Products (Fitoterápicos e Naturais) ---
  await pool.query(`
    INSERT INTO products (code, name, category, quantity, min_stock, cost_price, sale_price, supplier) VALUES
    ('FIT-001', 'Óleo Essencial de Lavanda (10ml)', 'Óleos Essenciais', 20, 5, 15.00, 45.00, 'Natureza Viva'),
    ('FIT-002', 'Óleo Essencial de Melaleuca (10ml)', 'Óleos Essenciais', 15, 5, 18.00, 52.00, 'Natureza Viva'),
    ('CHA-001', 'Chá Relaxante de Camomila', 'Chás e Infusões', 50, 10, 5.00, 12.00, 'Ervas do Monte'),
    ('CHA-002', 'Chá de Hibisco Premium', 'Chás e Infusões', 40, 10, 6.00, 15.00, 'Ervas do Monte'),
    ('NAT-001', 'Mel Silvestre Orgânico (500g)', 'Naturais', 30, 8, 12.00, 35.00, 'Apicultura Real'),
    ('NAT-002', 'Própolis Verde em Gotas', 'Naturais', 25, 5, 10.00, 28.00, 'Apicultura Real'),
    ('COS-001', 'Sabonete de Argila Verde', 'Cosméticos Naturais', 60, 15, 4.00, 15.00, 'BioAroma'),
    ('COS-002', 'Creme Facial de Calêndula', 'Cosméticos Naturais', 20, 5, 25.00, 68.00, 'BioAroma'),
    ('SUP-001', 'Cloreto de Magnésio P.A.', 'Suplementos', 100, 20, 8.00, 22.00, 'Vittalis')
  `);

  // --- Transactions ---
  await pool.query(`
    INSERT INTO transactions (type, category, description, value, date) VALUES
    ('receita', 'Venda', 'Venda avulsa balcão', 120.00, NOW()),
    ('despesa', 'Fornecedor', 'Reposição de estoque produtos naturais', 350.00, NOW()),
    ('despesa', 'Embalagens', 'Compra de embalagens diversas', 150.00, NOW())
  `);

  // --- Inventory Log ---
  await pool.query(`
    INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date) VALUES
    (1, 'Óleo Essencial de Lavanda (10ml)', 'entrada', 20, 'Estoque inicial', NOW()),
    (5, 'Mel Silvestre Orgânico (500g)', 'entrada', 30, 'Estoque inicial', NOW())
  `);

  console.log('✅ Dados de exemplo inseridos com sucesso!');
}

async function run() {
  try {
    pool.init(process.env.DATABASE_URL);
    await createTables();
    await seedData();
    console.log('\n🎉 Banco de dados pronto!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}

export { createTables, seedData };

