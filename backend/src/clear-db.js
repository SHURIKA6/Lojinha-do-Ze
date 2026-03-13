import { createDb } from './db.js';
import { getRequiredEnv, loadLocalEnv } from './load-local-env.js';

loadLocalEnv();

async function clearAllData() {
  console.log('🗑️  Limpando todos os dados do banco...\n');
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  try {
    // Disable FK constraints temporarily and truncate all tables
    await db.query(`
      TRUNCATE TABLE 
        password_setup_tokens,
        auth_sessions,
        inventory_log,
        transactions,
        orders,
        products,
        users
      CASCADE;
    `);

    // Reset all sequences (auto-increment IDs)
    await db.query(`
      ALTER SEQUENCE users_id_seq RESTART WITH 1;
      ALTER SEQUENCE products_id_seq RESTART WITH 1;
      ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
      ALTER SEQUENCE inventory_log_id_seq RESTART WITH 1;
      ALTER SEQUENCE orders_id_seq RESTART WITH 1;
      ALTER SEQUENCE auth_sessions_id_seq RESTART WITH 1;
      ALTER SEQUENCE password_setup_tokens_id_seq RESTART WITH 1;
    `);

    console.log('✅ Todos os dados foram apagados com sucesso!');
    console.log('✅ Sequências de ID resetadas para 1.');
  } catch (err) {
    console.error('❌ Erro ao limpar dados:', err.message);
  } finally {
    await db.close();
  }
}

clearAllData();
