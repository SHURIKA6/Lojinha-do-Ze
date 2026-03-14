import * as migration001 from './001_initial.js';
import * as migration002 from './002_fix_transactions_schema.js';

const migrations = [migration001, migration002];

export async function runMigrations(db) {
  const client = await db.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT id FROM schema_migrations');
    const appliedIds = new Set(rows.map((row) => row.id));

    for (const migration of migrations) {
      if (appliedIds.has(migration.id)) {
        continue;
      }

      await client.query('BEGIN');

      try {
        await migration.up(client);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
}
