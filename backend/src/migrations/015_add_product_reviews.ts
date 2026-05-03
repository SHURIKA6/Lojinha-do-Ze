export const id = '015_add_product_reviews';
import { Database } from '../core/types';

/**
 * Cria a tabela product_reviews para armazenar avaliações de produtos dos clientes.
 * Inclui avaliação (1-5), comentário, status de aprovação e referências ao
 * produto e ao usuário. Cria índices em product_id e user_id para performance.
 * @param db - Instância do banco de dados para executar consultas
 */
export async function up(db: Database) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      is_approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
  `);
}

/**
 * Reverte a migração de avaliações de produtos removendo a tabela product_reviews.
 * @param db - Instância do banco de dados para executar consultas
 */
export async function down(db: Database) {
  await db.query(`DROP TABLE IF EXISTS product_reviews;`);
}
