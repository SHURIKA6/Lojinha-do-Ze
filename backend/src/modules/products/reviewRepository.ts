import { Database } from '../../core/types';

/**
 * Representa uma avaliação de produto no sistema.
 * Inclui campo opcional user_name quando feito join com a tabela users.
 */
export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
  user_name?: string;
}

/**
 * Dados necessários para criar uma nova avaliação de produto.
 */
export interface CreateReviewData {
  productId: number;
  userId: number;
  rating: number;
  comment?: string;
}

/**
 * Cria uma nova avaliação de produto no banco de dados.
 * Avaliações são criadas com is_approved = false por padrão (pendente de aprovação).
 * @param db - Instância de conexão com o banco de dados
 * @param data - Dados para criação da avaliação incluindo ID do produto, ID do usuário, nota e comentário opcional
 * @returns Objeto da avaliação recém-criada
 */
export async function createReview(db: Database, data: CreateReviewData): Promise<Review> {
  const { rows } = await db.query(
    `INSERT INTO product_reviews (product_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.productId, data.userId, data.rating, data.comment || null]
  );
  return rows[0];
}

/**
 * Recupera todas as avaliações aprovadas de um produto específico com nomes de usuários.
 * Avaliações são ordenadas por data de criação (mais recentes primeiro).
 * @param db - Instância de conexão com o banco de dados
 * @param productId - ID do produto para obter as avaliações
 * @returns Array de objetos de avaliações aprovadas com nomes de usuários
 */
export async function getApprovedReviewsByProduct(db: Database, productId: number): Promise<Review[]> {
  const { rows } = await db.query(
    `SELECT r.*, u.name as user_name
     FROM product_reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = $1 AND r.is_approved = true
     ORDER BY r.created_at DESC`,
    [productId]
  );
  return rows;
}

/**
 * Recupera todas as avaliações pendentes que precisam de aprovação.
 * Inclui nomes de usuários e nomes de produtos para revisão do admin.
 * Ordenado por data de criação (mais antigo primeiro).
 * @param db - Instância de conexão com o banco de dados
 * @returns Array de objetos de avaliações pendentes com informações de usuário e produto
 */
export async function getPendingReviews(db: Database): Promise<Review[]> {
  const { rows } = await db.query(
    `SELECT r.*, u.name as user_name, p.name as product_name
     FROM product_reviews r
     JOIN users u ON r.user_id = u.id
     JOIN products p ON r.product_id = p.id
     WHERE r.is_approved = false
     ORDER BY r.created_at ASC`
  );
  return rows;
}

/**
 * Aprova uma avaliação definindo is_approved como true.
 * @param db - Instância de conexão com o banco de dados
 * @param id - ID da avaliação a ser aprovada
 * @returns True se a avaliação foi encontrada e aprovada, false caso contrário
 */
export async function approveReview(db: Database, id: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'UPDATE product_reviews SET is_approved = true, updated_at = NOW() WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

/**
 * Exclui uma avaliação do banco de dados pelo seu ID.
 * @param db - Instância de conexão com o banco de dados
 * @param id - ID da avaliação a ser excluída
 * @returns True se a avaliação foi encontrada e excluída, false caso contrário
 */
export async function deleteReview(db: Database, id: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'DELETE FROM product_reviews WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

/**
 * Calcula o resumo das notas de um produto (total de avaliações e média).
 * Inclui apenas avaliações aprovadas no cálculo.
 * @param db - Instância de conexão com o banco de dados
 * @param productId - ID do produto para obter o resumo das notas
 * @returns Objeto contendo contagem total de avaliações e média das notas (arredondada para 1 casa decimal)
 */
export async function getProductRatingSummary(db: Database, productId: number) {
  const { rows } = await db.query(
    `SELECT 
      COUNT(*) as total_reviews,
      AVG(rating)::numeric(2,1) as average_rating
     FROM product_reviews
     WHERE product_id = $1 AND is_approved = true`,
    [productId]
  );
  return {
    total: parseInt(rows[0]?.total_reviews || '0'),
    average: parseFloat(rows[0]?.average_rating || '0')
  };
}
