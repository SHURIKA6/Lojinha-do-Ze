import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

async function checkLogs() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    return;
  }
  
  const sql = neon(DATABASE_URL, { fullResults: true });
  
  try {
    console.log('Checking table counts...');
    const tables = ['system_logs', 'audit_logs', 'users', 'products', 'auth_sessions'];
    
    for (const table of tables) {
      try {
        const { rows } = await sql.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`Table ${table}: ${rows[0].count} rows`);
      } catch (e) {
        console.log(`Table ${table} error: ${e.message}`);
      }
    }

    console.log('\nFetching last 5 system logs...');
    const { rows: logs } = await sql.query(
      'SELECT id, level, message, context, created_at FROM system_logs ORDER BY created_at DESC LIMIT 5'
    );
    
    logs.forEach(log => {
      console.log(`[${log.created_at}] ${log.level.toUpperCase()}: ${log.message}`);
      console.log('---');
    });

  } catch (err) {
    console.error('Error fetching logs:', err);
  }
}

checkLogs();
