/* eslint-disable no-console */
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0lKf2oLxpyUB@ep-blue-bar-ajrpgupt-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const sql = neon(DATABASE_URL, { fullResults: true });
  try {
    console.log('--- Database Audit ---');
    
    // Check tables
    const tables = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(t => t.table_name).join(', '));

    // Check products columns
    const columns = await sql.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
    console.log('\nProducts Columns:');
    columns.rows.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`));

    // Check system_logs
    const logs = await sql.query("SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 5");
    console.log('\nRecent System Logs:', JSON.stringify(logs.rows, null, 2));

    // Check audit_logs with 500
    const audit500 = await sql.query("SELECT * FROM audit_logs WHERE details->>'status' = '500' OR action LIKE '%error%' ORDER BY created_at DESC LIMIT 5");
    console.log('\nAudit Logs (500/Errors):', JSON.stringify(audit500.rows, null, 2));

  } catch (err) {
    console.error('Error during audit:', err);
  }
}

main();
