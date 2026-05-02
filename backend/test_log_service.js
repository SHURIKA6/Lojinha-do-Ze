/* eslint-disable no-console */
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { logSystemEvent } from './src/modules/system/logService';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL, { fullResults: true });

async function main() {
  // Mock Database object to match what service expects
  const db = {
    query: async (text, params) => {
      return await sql.query(text, params);
    },
    connect: async () => ({
        query: async (text, params) => {
            return await sql.query(text, params);
        },
        release: () => {}
    })
  };

  const env = {
    ZE_PHONE: process.env.ZE_PHONE,
    ENVIRONMENT: 'test-from-scratch'
  };

  try {
    console.log('--- Testing logSystemEvent ---');
    await logSystemEvent(
      db, 
      env, 
      'error', 
      'DIAGNOSTIC LOG: Testing logSystemEvent from scratch script', 
      { test: true }, 
      new Error('Test Diagnostic Error')
    );
    console.log('Log sent successfully (check database now)');
  } catch (err) {
    console.error('Failed to send log:', err);
  }
}

main();
