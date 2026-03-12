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

async function clearAllData() {
  console.log('🗑️  Limpando todos os dados do banco...\n');

  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('❌ ERRO CRÍTICO: Tentativa de limpar banco de PRODUÇÃO sem flag --force.');
    console.error('   Operação abortada para sua segurança.');
    process.exit(1);
  }

  try {
    pool.init(process.env.DATABASE_URL);
    
    // Disable FK constraints temporarily and truncate all tables
    await pool.query(`
      TRUNCATE TABLE 
        inventory_log,
        transactions,
        orders,
        products,
        users
      CASCADE;
    `);

    // Reset all sequences (auto-increment IDs)
    await pool.query(`
      ALTER SEQUENCE users_id_seq RESTART WITH 1;
      ALTER SEQUENCE products_id_seq RESTART WITH 1;
      ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
      ALTER SEQUENCE inventory_log_id_seq RESTART WITH 1;
      ALTER SEQUENCE orders_id_seq RESTART WITH 1;
    `);

    console.log('✅ Todos os dados foram apagados com sucesso!');
    console.log('✅ Sequências de ID resetadas para 1.');
  } catch (err) {
    console.error('❌ Erro ao limpar dados:', err.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  clearAllData();
}

export default clearAllData;
