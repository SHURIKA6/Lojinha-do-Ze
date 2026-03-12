import pool from './db.js';
import bcrypt from 'bcryptjs';

async function createTables() {
  console.log('📦 Criando tabelas...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer',
      phone VARCHAR(30),
      cpf VARCHAR(20),
      address TEXT,
      notes TEXT,
      avatar VARCHAR(5),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

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

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name VARCHAR(255),
      description TEXT NOT NULL,
      device VARCHAR(255),
      status VARCHAR(30) DEFAULT 'pendente',
      value DECIMAL(10,2) DEFAULT 0,
      cost DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      deadline DATE,
      products_used JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name VARCHAR(255),
      description TEXT,
      total_value DECIMAL(10,2) DEFAULT 0,
      paid_value DECIMAL(10,2) DEFAULT 0,
      remaining_value DECIMAL(10,2) DEFAULT 0,
      method VARCHAR(30),
      status VARCHAR(30) DEFAULT 'pendente',
      installments INTEGER DEFAULT 1,
      date TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      value DECIMAL(10,2) DEFAULT 0,
      date DATE,
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

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(30) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      total DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(30) DEFAULT 'novo',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
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

  const adminPassStr = process.env.ADMIN_PASSWORD || 'Admin.Lojinha2026!';
  const clientPassStr = process.env.CLIENT_PASSWORD || 'Cliente.Lojinha2026!';

  const adminPass = await bcrypt.hash(adminPassStr, 10);
  const clientPass = await bcrypt.hash(clientPassStr, 10);

  // --- Users ---
  await pool.query(`
    INSERT INTO users (name, email, password, role, phone, cpf, address, avatar) VALUES
    ('José Silva', 'jose@lojinha.com', $1, 'admin', '(11) 99999-1234', NULL, NULL, 'JS'),
    ('Maria Oliveira', 'maria@email.com', $2, 'customer', '(11) 98765-4321', '123.456.789-00', 'Rua das Flores, 123 - São Paulo/SP', 'MO'),
    ('Carlos Santos', 'carlos@email.com', $2, 'customer', '(11) 91234-5678', '987.654.321-00', 'Av. Brasil, 456 - São Paulo/SP', 'CS'),
    ('Ana Pereira', 'ana@email.com', $2, 'customer', '(21) 99876-5432', '456.789.123-00', 'Rua do Sol, 789 - Rio de Janeiro/RJ', 'AP'),
    ('Roberto Lima', 'roberto@email.com', $2, 'customer', '(31) 98765-1234', '321.654.987-00', 'Rua Minas, 321 - Belo Horizonte/MG', 'RL'),
    ('Fernanda Costa', 'fernanda@email.com', $2, 'customer', '(41) 99123-4567', '654.321.987-00', 'Av. Paraná, 654 - Curitiba/PR', 'FC')
  `, [adminPass, clientPass]);

  // --- Products (Produtos de Saúde) ---
  await pool.query(`
    INSERT INTO products (code, name, category, quantity, min_stock, cost_price, sale_price, supplier) VALUES
    ('VT-001', 'Vitamina C 1000mg (60 cáps)', 'Vitaminas', 50, 15, 12.00, 29.90, 'NutriVida'),
    ('VT-002', 'Vitamina D3 2000UI (30 cáps)', 'Vitaminas', 40, 10, 10.00, 24.90, 'NutriVida'),
    ('VT-003', 'Complexo B (60 cáps)', 'Vitaminas', 35, 10, 14.00, 32.90, 'NutriVida'),
    ('SP-001', 'Whey Protein Isolado 900g', 'Suplementos', 20, 5, 65.00, 139.90, 'ProHealth'),
    ('SP-002', 'Creatina Monohidratada 300g', 'Suplementos', 25, 8, 30.00, 69.90, 'ProHealth'),
    ('SP-003', 'Colágeno Hidrolisado 300g', 'Suplementos', 30, 10, 22.00, 49.90, 'BioNatural'),
    ('CH-001', 'Chá de Camomila (30 sachês)', 'Chás Naturais', 60, 20, 4.00, 12.90, 'HerbalLife'),
    ('CH-002', 'Chá Verde Orgânico (30 sachês)', 'Chás Naturais', 45, 15, 5.00, 14.90, 'HerbalLife'),
    ('OE-001', 'Óleo Essencial Lavanda 10ml', 'Óleos Essenciais', 18, 5, 15.00, 34.90, 'AromaSaúde'),
    ('OE-002', 'Óleo Essencial Melaleuca 10ml', 'Óleos Essenciais', 15, 5, 18.00, 39.90, 'AromaSaúde'),
    ('HG-001', 'Protetor Solar FPS 50 120ml', 'Higiene e Cuidados', 35, 10, 20.00, 45.90, 'DermaCare'),
    ('HG-002', 'Sabonete Íntimo Natural 200ml', 'Higiene e Cuidados', 28, 10, 8.00, 22.90, 'BioNatural')
  `);

  // --- Services ---
  await pool.query(`
    INSERT INTO services (customer_id, customer_name, description, device, status, value, cost, products_used, notes, deadline) VALUES
    (2, 'Maria Oliveira', 'Consultoria nutricional + kit vitaminas', 'N/A', 'concluido', 120.00, 36.00, '[{"productId":1,"name":"Vitamina C 1000mg","quantity":1,"price":29.90},{"productId":2,"name":"Vitamina D3 2000UI","quantity":1,"price":24.90}]', 'Cliente com deficiência vitamínica. Recomendado suplementação por 3 meses.', '2025-03-08'),
    (3, 'Carlos Santos', 'Montagem de kit fitness personalizado', 'N/A', 'em_andamento', 250.00, 95.00, '[{"productId":4,"name":"Whey Protein Isolado 900g","quantity":1,"price":139.90},{"productId":5,"name":"Creatina Monohidratada 300g","quantity":1,"price":69.90}]', 'Cliente pratica musculação. Kit para ganho de massa.', '2025-03-12'),
    (4, 'Ana Pereira', 'Programa de bem-estar natural', 'N/A', 'pendente', 95.00, 19.00, '[{"productId":9,"name":"Óleo Essencial Lavanda 10ml","quantity":1,"price":34.90},{"productId":7,"name":"Chá de Camomila","quantity":2,"price":12.90}]', 'Pacote relaxamento: aromaterapia + chás calmantes.', '2025-03-15'),
    (2, 'Maria Oliveira', 'Reposição de colágeno + protetor solar', 'N/A', 'entregue', 95.80, 42.00, '[{"productId":6,"name":"Colágeno Hidrolisado 300g","quantity":1,"price":49.90},{"productId":11,"name":"Protetor Solar FPS 50","quantity":1,"price":45.90}]', 'Cliente busca cuidados com pele e articulações.', '2025-03-03'),
    (5, 'Roberto Lima', 'Kit imunidade reforçada', 'N/A', 'em_andamento', 87.70, 36.00, '[{"productId":1,"name":"Vitamina C 1000mg","quantity":1,"price":29.90},{"productId":2,"name":"Vitamina D3 2000UI","quantity":1,"price":24.90},{"productId":3,"name":"Complexo B","quantity":1,"price":32.90}]', 'Reforço imunológico para época de gripes.', '2025-03-13'),
    (6, 'Fernanda Costa', 'Programa detox + chás', 'N/A', 'pendente', 77.70, 31.00, '[{"productId":8,"name":"Chá Verde Orgânico","quantity":2,"price":14.90},{"productId":6,"name":"Colágeno Hidrolisado 300g","quantity":1,"price":49.90}]', 'Programa de desintoxicação de 30 dias com chás e colágeno.', '2025-03-18')
  `);

  // --- Payments ---
  await pool.query(`
    INSERT INTO payments (service_id, customer_id, customer_name, description, total_value, paid_value, remaining_value, method, status, installments, date) VALUES
    (1, 2, 'Maria Oliveira', 'Pagamento - Consultoria + kit vitaminas', 120.00, 120.00, 0, 'pix', 'pago', 1, '2025-03-08 14:00:00'),
    (4, 2, 'Maria Oliveira', 'Pagamento - Colágeno + protetor solar', 95.80, 95.80, 0, 'dinheiro', 'pago', 1, '2025-03-03 16:00:00'),
    (2, 3, 'Carlos Santos', 'Pagamento - Kit fitness personalizado', 250.00, 125.00, 125.00, 'cartao', 'parcial', 2, '2025-03-10 09:30:00'),
    (5, 5, 'Roberto Lima', 'Pagamento - Kit imunidade reforçada', 87.70, 0, 87.70, '', 'pendente', 1, NULL),
    (6, 6, 'Fernanda Costa', 'Pagamento - Programa detox + chás', 77.70, 0, 77.70, '', 'pendente', 1, NULL)
  `);

  // --- Transactions ---
  await pool.query(`
    INSERT INTO transactions (type, category, description, value, date) VALUES
    ('entrada', 'Serviço', 'Consultoria + kit vitaminas - Maria', 120.00, '2025-03-08'),
    ('entrada', 'Serviço', 'Colágeno + protetor solar - Maria', 95.80, '2025-03-03'),
    ('entrada', 'Serviço', 'Pagamento parcial kit fitness - Carlos', 125.00, '2025-03-10'),
    ('saida', 'Fornecedor', 'Compra de vitaminas - NutriVida', 800.00, '2025-03-01'),
    ('saida', 'Fornecedor', 'Compra de suplementos - ProHealth', 650.00, '2025-03-02'),
    ('saida', 'Aluguel', 'Aluguel do mês - Março', 1500.00, '2025-03-05'),
    ('saida', 'Energia', 'Conta de luz - Março', 280.00, '2025-03-06'),
    ('entrada', 'Venda', 'Venda de chás avulsos', 89.40, '2025-03-07'),
    ('entrada', 'Venda', 'Venda de óleos essenciais', 74.80, '2025-03-09'),
    ('saida', 'Fornecedor', 'Compra de chás e óleos - HerbalLife/AromaSaúde', 380.00, '2025-03-04'),
    ('entrada', 'Venda', 'Venda de protetor solar avulso', 45.90, '2025-02-28'),
    ('entrada', 'Venda', 'Venda de colágeno avulso', 49.90, '2025-02-25'),
    ('saida', 'Internet', 'Conta de internet - Março', 120.00, '2025-03-07')
  `);

  // --- Inventory Log ---
  await pool.query(`
    INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date) VALUES
    (1, 'Vitamina C 1000mg', 'saida', 2, 'Serviço - Kit vitaminas Maria + Kit imunidade Roberto', '2025-03-05 10:00:00'),
    (4, 'Whey Protein Isolado 900g', 'saida', 1, 'Serviço - Kit fitness Carlos', '2025-03-10 09:00:00'),
    (6, 'Colágeno Hidrolisado 300g', 'saida', 2, 'Serviço - Colágeno Maria + Programa detox Fernanda', '2025-03-02 11:00:00'),
    (9, 'Óleo Essencial Lavanda 10ml', 'saida', 1, 'Serviço - Programa bem-estar Ana', '2025-03-02 11:00:00'),
    (1, 'Vitamina C 1000mg', 'entrada', 30, 'Compra fornecedor NutriVida', '2025-03-01 10:00:00'),
    (4, 'Whey Protein Isolado 900g', 'entrada', 15, 'Compra fornecedor ProHealth', '2025-03-02 11:00:00')
  `);

  console.log('✅ Dados de exemplo inseridos com sucesso!');
}

async function run() {
  try {
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
import { fileURLToPath } from 'url';
import { dirname } from 'path';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}

export { createTables, seedData };

