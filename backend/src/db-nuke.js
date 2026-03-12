import pool from './db.js';
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .dev.vars for local execution if present
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

async function updateSchema() {
  console.log('🔄 Atualizando schema do banco de dados (Alterando colunas)...');
  
  try {
    pool.init(process.env.DATABASE_URL);
    const client = await pool.connect();
    
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
    pool.end();
  }
}

updateSchema();
