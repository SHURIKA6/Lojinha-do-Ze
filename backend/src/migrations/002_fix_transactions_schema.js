export const id = '002_fix_transactions_schema';

export async function up(client) {
  // Ensure the transactions table exists (in case it was dropped and not recut)
  await client.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      value DECIMAL(10,2) DEFAULT 0,
      date TIMESTAMP DEFAULT NOW(),
      order_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Ensure created_at exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='created_at') THEN
        ALTER TABLE transactions ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
      END IF;
    END
    $$;
  `);

  // Ensure order_id exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='order_id') THEN
        ALTER TABLE transactions ADD COLUMN order_id INTEGER;
      END IF;
    END
    $$;
  `);
}
