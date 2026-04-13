import { Pool, neon, neonConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { Database } from './types';
import { logger } from './utils/logger';

// Safe detection of Node.js vs Cloudflare Workers
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

if (isNode) {
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
    try {
      // The neon() driver returns the rows directly as an array or a specific structure
      // It handles Date objects and other types natively.
      const rows = await sql(text, params || []);
      return {
        rows: rows as T[],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as QueryResult<T>;
    } catch (err: any) {
      logger.error(`Erro na query HTTP: ${err.message}`, { text });
      throw err;
    }
  }

  return {
    async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      try {
        const trimmed = text.trim().toUpperCase();
        // Use HTTP driver for simple read queries (not transactions)
        const isTransaction = trimmed.startsWith('BEGIN') || trimmed.startsWith('COMMIT') || trimmed.startsWith('ROLLBACK') || trimmed.startsWith('SAVEPOINT');
        
        if (!isTransaction) {
          return await executeWithHttp<T>(text, params);
        }

        // Fallback to pool for transactions or explicit transaction control
        return await pool.query<T>(text, params);
      } catch (err: any) {
        // Auto-retry via HTTP if pool fails unexpectedly
        if (err.message?.includes('Connection terminated unexpectedly') || err.code === '57P01') {
          logger.warn('Conexão do pool terminada. Tentando via HTTP...');
          return executeWithHttp<T>(text, params);
        }
        logger.error(`Erro na query: ${err.message}`, { text });
        throw err;
      }
    },

    async connect() {
      ensureOpen();
      try {
        const client = await pool.connect();
        return client;
      } catch (err: any) {
        logger.error(`Erro ao conectar ao pool: ${err.message}`);
        throw err;
      }
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
