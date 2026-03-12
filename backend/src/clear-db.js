const pool = require('./db');

async function clearAllData() {
  console.log('🗑️  Limpando todos os dados do banco...\n');

  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('❌ ERRO CRÍTICO: Tentativa de limpar banco de PRODUÇÃO sem flag --force.');
    console.error('   Operação abortada para sua segurança.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('❌ ERRO CRÍTICO: Tentativa de limpar banco de PRODUÇÃO sem flag --force.');
    console.error('   Operação abortada para sua segurança.');
    process.exit(1);
  }

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
