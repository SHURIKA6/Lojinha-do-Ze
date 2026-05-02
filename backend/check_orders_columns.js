import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const sql = neon(DATABASE_URL, { fullResults: true });
  try {
    const columns = await sql.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
    console.log(JSON.stringify(columns.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
