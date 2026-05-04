export const id = '016_order_status_history';

/**
 * Cria a tabela order_status_history para auditoria de mudanças de status de pedidos.
 * @param client - Cliente do banco de dados (geralmente uma transação)
 */
export async function up(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      old_status VARCHAR(30),
      new_status VARCHAR(30) NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
  `);
}
