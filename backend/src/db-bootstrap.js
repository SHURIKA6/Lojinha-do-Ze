import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { createDb } from './db.js';
import { PRODUCT_CATEGORY_VALUES } from './domain/constants.js';
import { loadLocalEnv, getRequiredEnv } from './load-local-env.js';
import { runMigrations } from './migrations/runner.js';
import { randomToken } from './utils/crypto.js';

loadLocalEnv();

async function seedData(db) {
  const { rows } = await db.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count, 10) > 0) {
    console.log('ℹ️ Banco já possui dados, pulando seed.');
    return;
  }

  console.log('🌱 Inserindo dados de exemplo...');

  const adminPassword = process.env.ADMIN_PASSWORD;
  const clientPassword = process.env.CLIENT_PASSWORD;

  if (!adminPassword) {
    console.warn('⚠️ ADMIN_PASSWORD não fornecido. O seed não criará usuário administrador.');
  } else {
    const adminHash = await bcrypt.hash(adminPassword, 12);
    await db.query(
      `INSERT INTO users (name, email, password, role, phone, avatar)
       VALUES ('José Silva', 'jose@lojinha.com', $1, 'admin', '(11) 99999-1234', 'JS')`,
      [adminHash]
    );
  }

  if (!clientPassword) {
    console.warn(
      '⚠️ CLIENT_PASSWORD não fornecido. Clientes de seed receberão senhas aleatórias não exibidas.'
    );
  }

  const getClientHash = async () => {
    const sourcePassword = clientPassword || `${randomToken(8)}Aa1`;
    return bcrypt.hash(sourcePassword, 12);
  };

  const clients = [
    ['Maria Oliveira', 'maria@email.com', '(11) 98765-4321', '123.456.789-00', 'Rua das Flores, 123 - São Paulo/SP', 'MO'],
    ['Carlos Santos', 'carlos@email.com', '(11) 91234-5678', '987.654.321-00', 'Av. Brasil, 456 - São Paulo/SP', 'CS'],
    ['Ana Pereira', 'ana@email.com', '(21) 99876-5432', '456.789.123-00', 'Rua do Sol, 789 - Rio de Janeiro/RJ', 'AP'],
    ['Roberto Lima', 'roberto@email.com', '(31) 98765-1234', '321.654.987-00', 'Rua Minas, 321 - Belo Horizonte/MG', 'RL'],
    ['Fernanda Costa', 'fernanda@email.com', '(41) 99123-4567', '654.321.987-00', 'Av. Paraná, 654 - Curitiba/PR', 'FC'],
  ];

  for (const [name, email, phone, cpf, address, avatar] of clients) {
    await db.query(
      `INSERT INTO users (name, email, password, role, phone, cpf, address, avatar)
       VALUES ($1, $2, $3, 'customer', $4, $5, $6, $7)`,
      [name, email, await getClientHash(), phone, cpf, address, avatar]
    );
  }

  const products = [
    ['FIT-001', 'Óleo Essencial de Lavanda (10ml)', 'Óleos Essenciais', 20, 5, 15, 45, 'Natureza Viva', true],
    ['FIT-002', 'Óleo Essencial de Melaleuca (10ml)', 'Óleos Essenciais', 15, 5, 18, 52, 'Natureza Viva', true],
    ['CHA-001', 'Chá Relaxante de Camomila', 'Chás e Infusões', 50, 10, 5, 12, 'Ervas do Monte', true],
    ['CHA-002', 'Chá de Hibisco Premium', 'Chás e Infusões', 40, 10, 6, 15, 'Ervas do Monte', true],
    ['NAT-001', 'Mel Silvestre Orgânico (500g)', 'Naturais', 30, 8, 12, 35, 'Apicultura Real', true],
    ['NAT-002', 'Própolis Verde em Gotas', 'Naturais', 25, 5, 10, 28, 'Apicultura Real', true],
    ['COS-001', 'Sabonete de Argila Verde', 'Cosméticos Naturais', 60, 15, 4, 15, 'BioAroma', true],
    ['COS-002', 'Creme Facial de Calêndula', 'Cosméticos Naturais', 20, 5, 25, 68, 'BioAroma', true],
    ['SUP-001', 'Cloreto de Magnésio P.A.', 'Suplementos', 100, 20, 8, 22, 'Vittalis', true],
  ];

  for (const [code, name, category, quantity, minStock, costPrice, salePrice, supplier, isActive] of products) {
    const safeCategory = PRODUCT_CATEGORY_VALUES.includes(category) ? category : 'Outros';
    await db.query(
      `INSERT INTO products (code, name, category, quantity, min_stock, cost_price, sale_price, supplier, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [code, name, safeCategory, quantity, minStock, costPrice, salePrice, supplier, isActive]
    );
  }

  await db.query(`
    INSERT INTO transactions (type, category, description, value, date) VALUES
    ('receita', 'Venda', 'Venda avulsa balcão', 120.00, NOW()),
    ('despesa', 'Fornecedor', 'Reposição de estoque produtos naturais', 350.00, NOW()),
    ('despesa', 'Embalagens', 'Compra de embalagens diversas', 150.00, NOW())
  `);

  await db.query(`
    INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date) VALUES
    (1, 'Óleo Essencial de Lavanda (10ml)', 'entrada', 20, 'Estoque inicial', NOW()),
    (5, 'Mel Silvestre Orgânico (500g)', 'entrada', 30, 'Estoque inicial', NOW())
  `);

  console.log('✅ Dados de exemplo inseridos com sucesso!');
}

export async function bootstrapDatabase() {
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  try {
    await runMigrations(db);
    await seedData(db);
    console.log('\n🎉 Banco de dados pronto!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrapDatabase().catch((err) => {
    console.error('Fatal Database Bootstrap Error:', err);
    process.exitCode = 1;
  });
}
