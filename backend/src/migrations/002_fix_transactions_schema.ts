export const id = '002_fix_transactions_schema';

/**
 * Migração para corrigir o esquema da tabela transactions.
 * Garante que a tabela transactions existe e possui as colunas necessárias (created_at, order_id).
 * Utiliza lógica condicional para evitar erros caso as colunas já existam.
 *
 * Operações SQL:
 * - CREATE TABLE IF NOT EXISTS transactions (id, type, category, description, value, date, order_id, created_at)
 * - ADD COLUMN created_at IF NOT EXISTS (usando bloco DO para verificação condicional)
 * - ADD COLUMN order_id IF NOT EXISTS (usando bloco DO para verificação condicional)
 *
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
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
