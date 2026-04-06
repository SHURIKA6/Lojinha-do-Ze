import { Pool, neonConfig, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { Database } from './types';

if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

let globalPool: Pool | null = null;

export function createDb(connectionString: string): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Não usar singleton em testes para evitar vazamento de conexões/handles entre suítes
  const isTest = globalThis.process?.env?.NODE_ENV === 'test';
  
  if (!globalPool && !isTest) {
    globalPool = new Pool({ connectionString });
  }
  
  const pool = isTest ? new Pool({ connectionString }) : globalPool!;
  let closed = false;

  return {
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
      return pool.query<T>(text, params);
    },

    async connect(): Promise<Database> {
      const client = await pool.connect();
      return {
        query: client.query.bind(client),
        connect: async () => {
          throw new Error('Já conectado. Use o cliente atual ou crie uma nova conexão do Pool.');
        },
        close: async () => {
          client.release();
        },
        release: client.release.bind(client),
      };
    },

    async close() {
      if (closed) return;
      closed = true;
      // No singleton global, o close não deve destruir o pool que outros requests estão usando.
      // Em testes (onde o pool é local), precisamos fechar para não vazar handles.
      if (isTest) {
        await pool.end();
      }
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
