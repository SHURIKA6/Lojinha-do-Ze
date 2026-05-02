import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERRO: A variável de ambiente DATABASE_URL não está definida.');
  process.exit(1);
}

async function main() {
  const sql = neon(DATABASE_URL, { fullResults: true });
  try {
    console.log('--- Fetching Latest Logs (Today) ---');
    
    const today = new Date().toISOString().split('T')[0];
    const logs = await sql.query(`
      SELECT * FROM system_logs 
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`Found ${logs.rows.length} logs for today.`);
    console.log(JSON.stringify(logs.rows, null, 2));

  } catch (err) {
    console.error('Error fetching logs:', err);
  }
}

main();
