import { createDb } from '../src/db';
import { getRequiredEnv, loadLocalEnv } from '../src/load-local-env';

async function alterTable() {
  loadLocalEnv();
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  try {
    console.log('Adicionando colunas description e photo na tabela products...');
    await db.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS photo TEXT;
    `);
    console.log('✅ Colunas adicionadas com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
  } finally {
    await db.close();
  }
}

alterTable();
