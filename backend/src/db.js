import { neon } from '@neondatabase/serverless';

// Wrap Neon connection to provide the same interface as pg.Pool
// (pool.query returning { rows })
// We must initialize neon lazily because process.env is only available during the request in Cloudflare Workers
const pool = {
  getSql: () => {
    // In Cloudflare Workers, environment variables might be accessed via context or globally
    const url = typeof process !== 'undefined' && process.env.DATABASE_URL
      ? process.env.DATABASE_URL
      : '';
    if (!url) {
      console.warn("DATABASE_URL is not set");
    }
    return neon(url);
  },
  query: async (text, params) => {
    const sql = pool.getSql();
    const rows = await sql(text, params);
    return { rows };
  },
  connect: async () => {
    return {
      query: async (text, params) => {
        const sql = pool.getSql();
        const rows = await sql(text, params);
        return { rows };
      },
      release: () => {}
    };
  },
  end: async () => {}
};

export default pool;



