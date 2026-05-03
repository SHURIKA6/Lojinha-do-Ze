export const id = '013_add_loyalty_system';

/**
 * Implementa o sistema de pontos de fidelidade com duas tabelas.
 * Cria a tabela loyalty_points para rastreamento de saldo de pontos dos usuários (chave primária em user_id),
 * e a tabela loyalty_transactions para registro de transações de ganho/gasto de pontos.
 * Cria índices em user_id e order_id em loyalty_transactions para performance.
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    -- Tabela para saldo de pontos dos usuários
    CREATE TABLE IF NOT EXISTS loyalty_points (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Log de transações de pontos (ganho/gasto)
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      type VARCHAR(20) NOT NULL, -- 'earn' ou 'spend'
      points INTEGER NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON loyalty_transactions(order_id);
  `);
}
