const pool = require('./src/db');

async function alterTable() {
  try {
    console.log('Adicionando colunas description e photo na tabela products...');
    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS photo TEXT;
    `);
    console.log('✅ Colunas adicionadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

alterTable();
