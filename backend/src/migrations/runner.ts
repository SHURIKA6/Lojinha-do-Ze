import { Database } from '../../core/types';

export interface Migration {
  id: string;
  up: (client: any) => Promise<void>;
}

import * as migration001 from './001_initial';
import * as migration002 from './002_fix_transactions_schema';
import * as migration003 from './003_add_performance_indexes';
import * as migration004 from './004_additional_performance_indexes';
import * as migration005 from './005_add_mercado_pago_fields_to_orders';
import * as migration006 from './006_guest_customers_idx';
import * as migration007 from './007_add_refresh_tokens';
import * as migration008 from './008_add_performance_indexes';

const migrations: Migration[] = [
  { id: migration001.id, up: migration001.up },
  { id: migration002.id, up: migration002.up },
  { id: migration003.id, up: migration003.up },
  { id: migration004.id, up: migration004.up },
  { id: migration005.id, up: migration005.up },
  { id: migration006.id, up: migration006.up },
  { id: migration007.id, up: migration007.up },
  { id: migration008.id, up: migration008.up },
];

export async function runMigrations(db: Database): Promise<void> {
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

      console.log(`Aplicando migração: ${migration.id}`);
      await client.query('BEGIN');

      try {
        await migration.up(client);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        await client.query('COMMIT');
        console.log(`✅ Migração ${migration.id} aplicada com sucesso.`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Erro na migração ${migration.id}:`, error);
        throw error;
      }
    }
  } finally {
    client.release();
  }
}
