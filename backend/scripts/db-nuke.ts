/* eslint-disable no-console */
import { createDb } from '../src/core/db.ts';
import { getRequiredEnv, loadLocalEnv } from '../src/core/load-local-env.ts';

loadLocalEnv();

async function updateSchema(): Promise<void> {
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
    
    console.log('🗑️ Tabelas antigas dropadas. O server.ts ou db-bootstrap.ts irá recriá-las.');
    client.release();
  } catch(err) {
    console.error('Erro:', err);
  } finally {
    await db.close();
  }
}

updateSchema();
