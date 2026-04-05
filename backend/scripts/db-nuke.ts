import { createDb } from '../src/db';
import { getRequiredEnv, loadLocalEnv } from '../src/load-local-env';

loadLocalEnv();

async function updateSchema() {
  console.log('🔄 Atualizando schema do banco de dados (Alterando colunas)...');
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  try {
    const client = await db.connect();
    
    // Drop the old tables entirely to rebuild cleanly
    await client.query('DROP TABLE IF EXISTS password_setup_tokens CASCADE');
    await client.query('DROP TABLE IF EXISTS auth_sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS inventory_log CASCADE');
    await client.query('DROP TABLE IF EXISTS transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    
    console.log('🗑️ Tabelas antigas dropadas. O server.js ou db-bootstrap.js irá recriá-las.');
    client.release();
  } catch (err: any) {
    console.error('Erro:', err);
  } finally {
    await db.close();
  }
}

updateSchema();
