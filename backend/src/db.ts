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
      // SEC-FIX: Neon serverless driver over HTTP can fail to serialize native JS Date objects
      const processedParams = params?.map(p => (p instanceof Date ? p.toISOString() : p));
      return pool.query<T>(text, processedParams);
    },

    async connect() {
      const client = await pool.connect();
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
