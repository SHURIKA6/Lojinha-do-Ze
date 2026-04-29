import { Database } from '../../core/types';

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

export interface CreateReviewData {
  productId: number;
  userId: number;
  rating: number;
  comment?: string;
}

export async function createReview(db: Database, data: CreateReviewData): Promise<Review> {
  const { rows } = await db.query(
    `INSERT INTO product_reviews (product_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.productId, data.userId, data.rating, data.comment || null]
  );
  return rows[0];
}

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

export async function approveReview(db: Database, id: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'UPDATE product_reviews SET is_approved = true, updated_at = NOW() WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

export async function deleteReview(db: Database, id: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'DELETE FROM product_reviews WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

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
