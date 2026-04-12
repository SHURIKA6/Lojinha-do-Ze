import { Pool, neonConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { Database } from './types';

if (typeof process !== 'undefined') {
  // Force disable WebSocket in Node.js to prevent ErrorEvent crashes
  // @ts-ignore
  neonConfig.webSocketConstructor = undefined;
} else if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

const poolCache = new Map<string, Pool>();

export function createDb(connectionString: string): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  let pool = poolCache.get(connectionString);
  if (!pool) {
    pool = new Pool({ connectionString });
    poolCache.set(connectionString, pool);
  }

  return {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      // SEC-FIX: Neon serverless driver over HTTP can fail to serialize native JS Date objects
      const processedParams = params?.map(p => (p instanceof Date ? p.toISOString() : p));
      return (pool as Pool).query<T>(text, processedParams);
    },

    async connect() {
      const client = await (pool as Pool).connect();
      const originalQuery = client.query.bind(client);
      
      // Override query to handle Date serialization
      // @ts-ignore - complex overloads on pg client
      client.query = (text: any, params?: any[]) => {
        const processedParams = Array.isArray(params) 
          ? params.map(p => (p instanceof Date ? p.toISOString() : p)) 
          : params;
        return originalQuery(text, processedParams);
      };
      
      return client;
    },

    async close() {
      // No longer automatically close the pool to allow reuse.
      // Pool end should be handled by a global lifecycle if needed,
      // but in serverless we usually just let it handle it.
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
