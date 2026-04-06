import * as migration001 from './001_initial';
import * as migration002 from './002_fix_transactions_schema';
import * as migration003 from './003_add_performance_indexes';
import * as migration004 from './004_additional_performance_indexes';
import * as migration005 from './005_add_mercado_pago_fields_to_orders';
import * as migration006 from './006_guest_customers_idx';
import * as migration007 from './007_add_refresh_tokens';
import * as migration008 from './008_add_performance_indexes';
import * as migration009 from './009_normalize_user_roles';
import { Database } from '../types/index';

const migrations = [
  migration001, 
  migration002, 
  migration003, 
  migration004, 
  migration005, 
  migration006,
  migration007,
  migration008,
  migration009
];

export async function runMigrations(db: Database) {
  const client = await db.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT id FROM schema_migrations');
    const appliedIds = new Set(rows.map((row: any) => row.id));

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
