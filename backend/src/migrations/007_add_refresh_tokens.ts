export const id = '007_add_refresh_tokens';

/**
 * Adiciona tabela de refresh tokens para autenticação JWT.
 * Cria a tabela refresh_tokens para suportar autenticação baseada em refresh tokens,
 * junto com índices de performance para validação e limpeza de tokens.
 *
 * Operações SQL:
 * - CREATE TABLE refresh_tokens (id, user_id, session_id, token_hash, ip_address, user_agent, expires_at, created_at, revoked_at)
 * - CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)
 * - CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)
 * - CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)
 * - CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id VARCHAR(64) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id VARCHAR(64) NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      ip_address VARCHAR(64),
      user_agent TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      revoked_at TIMESTAMP
    );

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens(session_id);
  `);
}
