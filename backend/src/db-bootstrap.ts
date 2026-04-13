import { createDb } from './core/db';
import { runMigrations } from './migrations/runner';
import * as m001 from './migrations/001_initial';
import * as m008 from './migrations/008_add_performance_indexes';

/**
 * Função principal de bootstrap para inicializar o banco de dados Neon
 */
export async function bootstrapDatabase(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada para o bootstrap');
  }

  const sql = createDb(databaseUrl);
  console.log('--- Iniciando Bootstrap do Banco de Dados ---');

  try {
    // 1. Rodar Migrações
    await runMigrations(sql);

    // 2. Criar usuário admin padrão se não existir
    console.log('Verificando usuário admin...');
    const { rows: users } = await sql.query('SELECT id FROM users WHERE email = \'jose@lojinha.com\'');

    if (users.length === 0) {
      console.log('Criando usuário admin inicial...');
      const adminPassHash = '$2b$10$TQH7yS2G9Wv7GK/Qo5xGue1X6m55H06E08e6/4H76L9.O5j2hGvG'; // admin123 (hash fixo para bootstrap)

      await sql.query(
        'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5)',
        ['José Riadd', 'jose@lojinha.com', adminPassHash, 'admin', 'active']
      );

      console.log('✅ Usuário admin criado com sucesso.');
    } else {
      console.log('ℹ️ Usuário admin já existe.');
    }

    console.log('--- Bootstrap concluído com sucesso ---');
  } catch (error) {
    console.error('CRITICAL: Falha no bootstrap do banco de dados:', error);
    throw error;
  }
}
