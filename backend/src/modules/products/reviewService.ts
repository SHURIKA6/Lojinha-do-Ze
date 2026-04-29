import { Database } from '../../core/types';
import * as reviewRepo from './reviewRepository';
import { logger } from '../../core/utils/logger';

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

export async function getPendingReviews(db: Database) {
  return reviewRepo.getPendingReviews(db);
}

export async function approveReview(db: Database, id: number) {
  return reviewRepo.approveReview(db, id);
}

export async function deleteReview(db: Database, id: number) {
  return reviewRepo.deleteReview(db, id);
}
