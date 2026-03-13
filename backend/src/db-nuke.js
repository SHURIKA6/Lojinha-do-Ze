import { createDb } from './db.js';
import { getRequiredEnv, loadLocalEnv } from './load-local-env.js';

loadLocalEnv();

async function updateSchema() {
  console.log('🔄 Atualizando schema do banco de dados (Alterando colunas)...');
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  try {
    const client = await db.connect();
    
    // Drop the old tables entirely to rebuild cleanly
    await client.query('DROP TABLE IF EXISTS inventory_log CASCADE');
    await client.query('DROP TABLE IF EXISTS transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('🗑️ Tabelas antigas dropadas. O server.js ou schema.js irá recriá-las.');
    client.release();
  } catch(err) {
    console.error('Erro:', err);
  } finally {
    await db.close();
  }
}

updateSchema();
