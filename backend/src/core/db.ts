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

// PERF: Route pool queries through fetch (HTTP) when WebSocket is unreliable
// This avoids the WebSocket handshake overhead and prevents Worker crashes
neonConfig.poolQueryViaFetch = true;
neonConfig.useSecureWebSocket = true;

// Global cache for connection resources to survive between requests in the same isolate
const poolCache = new Map<string, Pool>();
const httpCache = new Map<string, any>();

export function createDb(connectionString: string): Database {
  if (!connectionString) {
    logger.error('DATABASE_URL ausente! Verifique as variáveis de ambiente ou secrets do Cloudflare.');
    throw new Error('DATABASE_URL is not set');
  }

  // Use cached Pool if available, or create a new one
  if (!poolCache.has(connectionString)) {
    const obscuredUrl = connectionString.replace(/:\/\/.*@/, '://****:****@');
    logger.debug(`Criando novo Pool de conexões (URI: ${obscuredUrl})`);
    
    try {
      poolCache.set(connectionString, new Pool({ 
        connectionString,
        connectionTimeoutMillis: 5000 // Timeout para falhar rápido em caso de rede bloqueada
      }));
    } catch (err: any) {
      logger.error(`Falha crítica ao instanciar Pool do Postgres: ${err.message}`);
      throw err;
    }
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
      // O driver neon() pode ser chamado como função ou via .query()
      // Tentamos .query() primeiro por ser mais explícito para o padrão pg
      let result: any;
      if (typeof (sql as any).query === 'function') {
        result = await (sql as any).query(text, params || []);
      } else {
        // Fallback para chamada direta do driver neon(query, params)
        result = await (sql as any)(text, params || []);
      }

      // Normaliza o resultado para o formato QueryResult do pg
      const rows = Array.isArray(result) ? result : (result.rows || []);
      const rowCount = result.rowCount !== undefined ? result.rowCount : (Array.isArray(rows) ? rows.length : 0);

      return {
        rows: rows as T[],
        rowCount,
        command: result.command || 'SELECT',
        oid: 0,
        fields: result.fields || []
      } as QueryResult<T>;
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Erro na query HTTP: ${errorMsg}`, { text, params: params ? 'present' : 'none' });
      throw err;
    }
  }

  /**
   * Creates a pseudo-client that wraps the HTTP driver.
   * Transaction commands (BEGIN/COMMIT/ROLLBACK) become no-ops since HTTP queries are auto-committed.
   * This is used as a fallback when pool.connect() fails.
   * WARNING: This does NOT provide true transaction isolation.
   */
  function createHttpFallbackClient() {
    logger.warn('Usando fallback HTTP para client (sem transação real)');
    
    const txCommands = new Set(['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT']);
    
    return {
      async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const trimmed = text.trim().toUpperCase();
        const firstWord = trimmed.split(/\s/)[0];
        
        // No-op for transaction control statements in HTTP mode
        if (txCommands.has(firstWord)) {
          return { rows: [] as T[], rowCount: 0, command: firstWord, oid: 0, fields: [] } as QueryResult<T>;
        }
        
        return executeWithHttp<T>(text, params);
      },
      release() {
        // No-op for HTTP fallback
      },
    };
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
        const errorMsg = err?.message || String(err);
        const errorCode = err?.code;
        
        // Auto-retry via HTTP if pool fails unexpectedly
        if (errorMsg.includes('Connection terminated unexpectedly') || errorCode === '57P01') {
          logger.warn(`Conexão do pool falhou (${errorCode}). Tentando via HTTP...`, { text });
          return executeWithHttp<T>(text, params);
        }
        
        logger.error(`Erro na query do pool: ${errorMsg}`, { text, code: errorCode });
        throw err;
      }
    },

    async connect() {
      ensureOpen();
      try {
        const client = await pool.connect();
        return client;
      } catch (err: any) {
        logger.error(`Erro ao conectar ao pool: ${err.message}. Usando fallback HTTP.`);
        // Instead of crashing the Worker, return HTTP fallback client
        return createHttpFallbackClient();
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

