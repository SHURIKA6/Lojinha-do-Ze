import { createDb } from './src/db.js';
import { getRequiredEnv, loadLocalEnv } from './src/load-local-env.js';

async function fixDb() {
  loadLocalEnv();
  const db = createDb(getRequiredEnv('DATABASE_URL'));

  try {
    console.log('Criando tabelas auth_sessions e password_setup_tokens caso não existam...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        csrf_token VARCHAR(128) NOT NULL,
        ip_address VARCHAR(64),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_seen_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_setup_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        setup_code VARCHAR(16) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user_id ON password_setup_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_expires_at ON password_setup_tokens(expires_at);
    `);
    console.log('✅ Tabelas e índices criados com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await db.close();
  }
}

fixDb();
