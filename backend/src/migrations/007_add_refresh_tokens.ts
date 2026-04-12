export const id = '007_add_refresh_tokens';

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
