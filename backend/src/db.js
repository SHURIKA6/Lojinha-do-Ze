import { Pool } from '@neondatabase/serverless';

// Wrap Neon Pool connection to provide the standard pg.Pool interface
// We initialize it lazily because process.env is only available during request handling in Cloudflare
let lazyPool = null;

const pool = {
  getPool: () => {
    if (!lazyPool) {
      const url = typeof process !== 'undefined' && process.env.DATABASE_URL
        ? process.env.DATABASE_URL
        : '';
        
      if (!url) {
        console.warn("CRITICAL: DATABASE_URL is not set");
      }
      // Using Pool via WebSockets allows stateful transactions (BEGIN, COMMIT) and returns proper rowCount
      lazyPool = new Pool({ connectionString: url });
    }
    return lazyPool;
  },
  query: async (text, params) => {
    return pool.getPool().query(text, params);
  },
  connect: async () => {
    return pool.getPool().connect();
  },
  end: async () => {
    if (lazyPool) await lazyPool.end();
  }
};

export default pool;



