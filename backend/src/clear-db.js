const pool = require('./db');

async function clearAllData() {
  console.log('🗑️  Limpando todos os dados do banco...\n');

  try {
    // Disable FK constraints temporarily and truncate all tables
    await pool.query(`
      TRUNCATE TABLE 
        inventory_log,
        transactions,
        payments,
        services,
        orders,
        products,
        users
      CASCADE;
    `);

    // Reset all sequences (auto-increment IDs)
    await pool.query(`
      ALTER SEQUENCE users_id_seq RESTART WITH 1;
      ALTER SEQUENCE products_id_seq RESTART WITH 1;
      ALTER SEQUENCE services_id_seq RESTART WITH 1;
      ALTER SEQUENCE payments_id_seq RESTART WITH 1;
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

clearAllData();
