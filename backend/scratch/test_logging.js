import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

async function testLogging() {
  console.log('--- Testing System Logging ---');
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in .env');
    return;
  }

  const sql = neon(DATABASE_URL, { fullResults: true });
  
  const level = 'error';
  const message = 'TEST LOG FROM AGENT: Debugging logging system';
  const context = { test: true, timestamp: new Date().toISOString() };
  const errorStack = new Error('Test Error').stack;

  try {
    console.log('Attempting to insert log...');
    const query = `
      INSERT INTO system_logs (level, message, context, error_stack)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;
    
    const result = await sql.query(query, [
      level,
      message,
      JSON.stringify(context),
      errorStack
    ]);

    console.log('Success!', result.rows[0]);
    
    // Verify it exists
    const check = await sql.query('SELECT * FROM system_logs WHERE id = $1', [result.rows[0].id]);
    console.log('Verification:', check.rows[0]);

  } catch (err) {
    console.error('CRITICAL FAILURE during manual insert:', err);
    if (err.message.includes('column "error_stack" does not exist')) {
        console.error('SCHEMA MISMATCH: error_stack column missing in system_logs');
    }
  }
}

testLogging();
