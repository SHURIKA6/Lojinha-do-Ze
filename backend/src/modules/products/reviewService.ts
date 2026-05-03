import { Database } from '../../core/types';
import * as reviewRepo from './reviewRepository';
import { logger } from '../../core/utils/logger';

/**
 * Submete uma nova avaliação de produto ao sistema.
 * Registra a submissão da avaliação para fins de auditoria.
 * Avaliações são criadas com status pendente e requerem aprovação do administrador.
 * @param db - Instância de conexão com o banco de dados
 * @param data - Dados da avaliação incluindo ID do produto, ID do usuário, nota e comentário opcional
 * @returns Objeto da avaliação recém-criada
 */
export async function submitReview(db: Database, data: reviewRepo.CreateReviewData) {
  try {
    const review = await reviewRepo.createReview(db, data);
    logger.info(`Nova avaliação submetida para o produto ${data.productId} pelo usuário ${data.userId}`);
    return review;
  } catch (error) {
    logger.error('Erro ao submeter avaliação', error as Error);
    throw error;
  }
}

/**
 * Recupera todas as avaliações aprovadas e o resumo das notas para um produto específico.
 * Busca avaliações e estatísticas de notas em paralelo para melhor performance.
 * @param db - Instância de conexão com o banco de dados
 * @param productId - ID do produto para obter as avaliações
 * @returns Objeto contendo array de avaliações aprovadas e resumo das notas
 */
export async function getProductReviews(db: Database, productId: number) {
  const [reviews, summary] = await Promise.all([
    reviewRepo.getApprovedReviewsByProduct(db, productId),
    reviewRepo.getProductRatingSummary(db, productId)
  ]);
  
  return {
    reviews,
    summary
  };
}

/**
 * Recupera todas as avaliações pendentes que requerem aprovação do administrador.
 * @param db - Instância de conexão com o banco de dados
 * @returns Array de objetos de avaliações pendentes
 */
export async function getPendingReviews(db: Database) {
  return reviewRepo.getPendingReviews(db);
}

/**
 * Aprova uma avaliação pendente pelo seu ID.
 * @param db - Instância de conexão com o banco de dados
 * @param id - ID da avaliação a ser aprovada
 * @returns Objeto da avaliação atualizada ou null se não encontrada
 */
export async function approveReview(db: Database, id: number) {
  return reviewRepo.approveReview(db, id);
}

/**
 * Exclui uma avaliação do sistema pelo seu ID.
 * @param db - Instância de conexão com o banco de dados
 * @param id - ID da avaliação a ser excluída
 * @returns True se a avaliação foi excluída, false se não encontrada
 */
export async function deleteReview(db: Database, id: number) {
  return reviewRepo.deleteReview(db, id);
}
