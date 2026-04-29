import { createDb } from './core/db';
import { runMigrations } from './migrations/runner';
import { logger } from './core/utils/logger';
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
  logger.info('--- Iniciando Bootstrap do Banco de Dados ---');

  try {
    // 1. Rodar Migrações
    await runMigrations(sql);

    // 2. Criar usuário admin padrão se não existir
    logger.info('Verificando usuário admin...');
    const { rows: users } = await sql.query('SELECT id FROM users WHERE email = \'jose@lojinha.com\'');

    if (users.length === 0) {
      logger.info('Criando usuário admin inicial...');
      const adminPassHash = '$2b$10$TQH7yS2G9Wv7GK/Qo5xGue1X6m55H06E08e6/4H76L9.O5j2hGvG'; // admin123 (hash fixo para bootstrap)

      await sql.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['José Riadd', 'jose@lojinha.com', adminPassHash, 'admin']
      );

      logger.info('✅ Usuário admin criado com sucesso.');
    } else {
      logger.info('ℹ️ Usuário admin já existe.');
}

    logger.info('--- Bootstrap concluído com sucesso ---');
  } catch (error) {
    logger.error('CRITICAL: Falha no bootstrap do banco de dados:', error);
    throw error;
  }
}

import * as dotenv from 'dotenv';
dotenv.config();

// No need for a main check if we only run this file directly via tsx, but since it's imported elsewhere, we must check
import { fileURLToPath } from 'url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  bootstrapDatabase(process.env.DATABASE_URL || '')
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
