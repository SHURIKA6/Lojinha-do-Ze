import { Pool, neonConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { Database } from './types';

if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

export function createDb(connectionString: string): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  let closed = false;

  return {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      return pool.query<T>(text, params);
    },

    connect() {
      return pool.connect();
    },

    async close() {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}

export async function withDb<T>(
  connectionString: string, 
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = createDb(connectionString);
  try {
    return await callback(db);
  } finally {
    await db.close();
  }
}
