import { Pool, neonConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { Database } from './types';
import { logger } from './utils/logger';

if (typeof process !== 'undefined') {
  // Force disable WebSocket in Node.js to prevent ErrorEvent crashes
  // @ts-ignore
  neonConfig.webSocketConstructor = undefined;
} else if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

export function createDb(connectionString: string): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Em Cloudflare Workers, o pool precisa viver apenas durante a requisição atual.
  // Reutilizar pools entre requests vaza I/O assíncrono para outros handlers.
  const pool = new Pool({ connectionString });
  let closed = false;

  function ensureOpen() {
    if (closed) {
      throw new Error('Database connection has already been closed for this request');
    }
  }

  async function executeQuery<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    ensureOpen();
    const processedParams = params?.map((p) => (p instanceof Date ? p.toISOString() : p));
    return pool.query<T>(text, processedParams);
  }

  return {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      return executeQuery<T>(text, params).catch(async (err) => {
        if (err.message?.includes('Connection terminated unexpectedly') || err.code === '57P01') {
          logger.warn('Conexão do banco terminada inesperadamente. Tentando novamente...');
          return executeQuery<T>(text, params);
        }
        throw err;
      });
    },

    async connect() {
      ensureOpen();
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
