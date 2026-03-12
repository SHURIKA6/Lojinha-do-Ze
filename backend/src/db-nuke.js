import pool from './db.js';

async function updateSchema() {
  console.log('🔄 Atualizando schema do banco de dados (Alterando colunas)...');
  
  try {
    const client = await pool.connect();
    
    // Drop the old tables entirely to rebuild cleanly since tests don't have sensitive data
    // the user authorized deleting the DB in a previous conversation.
    await client.query('DROP TABLE IF EXISTS inventory_log CASCADE');
    await client.query('DROP TABLE IF EXISTS transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS payments CASCADE');
    await client.query('DROP TABLE IF EXISTS services CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('🗑️ Tabelas antigas dropadas. O server.js ou schema.js irá recriá-las.');
    client.release();
  } catch(err) {
    console.error('Erro:', err);
  } finally {
    pool.end();
  }
}

updateSchema();
