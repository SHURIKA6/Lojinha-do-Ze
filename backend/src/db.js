import { Pool } from '@neondatabase/serverless';

// Wrap Neon Pool connection to provide the standard pg.Pool interface
// We initialize it lazily because process.env is only available during request handling in Cloudflare
let lazyPool = null;

const pool = {
  init: (url) => {
    if (!lazyPool) {
      if (!url) console.warn("CRITICAL: DATABASE_URL is not set");
      lazyPool = new Pool({ connectionString: url });
    }
  },
  getPool: () => {
    if (!lazyPool) throw new Error("Database pool was not initialized");
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



