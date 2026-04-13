import { Pool, neon, neonConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { Database } from './types';
import { logger } from './utils/logger';

if (typeof process !== 'undefined') {
  // Force disable WebSocket in Node.js to prevent ErrorEvent crashes
  neonConfig.webSocketConstructor = undefined;
} else if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

// Global cache for connection resources to survive between requests in the same isolate
const poolCache = new Map<string, Pool>();
const httpCache = new Map<string, any>();

export function createDb(connectionString: string): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Use cached Pool if available, or create a new one
  if (!poolCache.has(connectionString)) {
    logger.debug('Criando novo Pool de conexões para o banco');
    poolCache.set(connectionString, new Pool({ connectionString }));
  }
  
  // Use cached HTTP client for single-shot queries
  if (!httpCache.has(connectionString)) {
    httpCache.set(connectionString, neon(connectionString));
  }

  const pool = poolCache.get(connectionString)!;
  const sql = httpCache.get(connectionString)!;
  let closed = false;

  function ensureOpen() {
    if (closed) {
      throw new Error('Database connection has already been closed for this request');
    }
  }

  async function executeWithHttp<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    ensureOpen();
    const processedParams = params?.map((p) => (p instanceof Date ? p.toISOString() : p));
    
    // The neon() driver returns the rows directly as an array or a specific structure
    const rows = await sql(text, processedParams || []);
    return {
      rows: rows as T[],
      rowCount: (rows as any).length,
      command: 'SELECT',
      oid: 0,
      fields: []
    } as QueryResult<T>;
  }

  return {
    async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      try {
        // Use HTTP driver for simple queries (no 'BEGIN' transaction block detected)
        const trimmed = text.trim().toUpperCase();
        const isTransaction = trimmed.startsWith('BEGIN') || trimmed.startsWith('COMMIT') || trimmed.startsWith('ROLLBACK');
        
        if (!isTransaction) {
          return await executeWithHttp<T>(text, params);
        }

        // Fallback to pool for transactions or explicit requests
        const processedParams = params?.map((p) => (p instanceof Date ? p.toISOString() : p));
        return await pool.query<T>(text, processedParams);
      } catch (err: any) {
        if (err.message?.includes('Connection terminated unexpectedly') || err.code === '57P01') {
          logger.warn('Conexão do banco terminada inesperadamente. Tentando via HTTP...');
          return executeWithHttp<T>(text, params);
        }
        throw err;
      }
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
      // We no longer call pool.end() here to keep connections alive in the cache
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
