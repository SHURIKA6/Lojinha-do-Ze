import { Pool } from '@neondatabase/serverless';

export function createDb(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  let closed = false;

  return {
    query(text, params) {
      return pool.query(text, params);
    },

    connect() {
      return pool.connect();
    },

    async close() {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}

export async function withDb(connectionString, callback) {
  const db = createDb(connectionString);
  try {
    return await callback(db);
  } finally {
    await db.close();
  }
}
