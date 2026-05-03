export const id = '011_security_and_maintenance';

/**
 * Adiciona tabelas e colunas de segurança e manutenção.
 * Cria a tabela audit_logs para rastreamento de ações administrativas,
 * a tabela system_logs para logs centralizados, e adiciona as colunas login_attempts
 * e locked_until à tabela users para proteção contra força bruta.
 * Também cria índices de performance nas novas tabelas.
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any) {
  // Tabela para log de ações administrativas
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(50),
      details JSONB,
      ip_address VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Tabela para logs centralizados do sistema
  await client.query(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id SERIAL PRIMARY KEY,
      level VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      context JSONB,
      error_stack TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Colunas para controle de tentativas de login
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
  `);

  // Índices para performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
    CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
  `);
}

/**
 * Reverte a migração de segurança e manutenção removendo
 * as tabelas system_logs e audit_logs, e removendo as colunas login_attempts
 * e locked_until da tabela users.
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function down(client: any) {
  await client.query(`DROP TABLE IF EXISTS system_logs;`);
  await client.query(`DROP TABLE IF EXISTS audit_logs;`);
  await client.query(`ALTER TABLE users DROP COLUMN IF NOT EXISTS login_attempts;`);
  await client.query(`ALTER TABLE users DROP COLUMN IF NOT EXISTS locked_until;`);
}
