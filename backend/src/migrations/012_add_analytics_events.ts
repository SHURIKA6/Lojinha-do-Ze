export const id = '012_add_analytics_events';

export async function up(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      session_id VARCHAR(128),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      page_url TEXT,
      metadata JSONB DEFAULT '{}',
      ip_address VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_at
      ON analytics_events(event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
      ON analytics_events(session_id);
  `);
}
