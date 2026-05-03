import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, adminOnly } from '../../core/middleware/auth';
import { jsonError, validationError } from '../../core/utils/http';
import * as reviewService from './reviewService';
import { Bindings, Variables } from '../../core/types';

/**
 * Roteador Hono para gerenciamento de avaliações de produtos.
 * Rotas públicas: visualizar avaliações aprovadas de um produto, submeter avaliações (autenticado).
 * Rotas administrativas: listar avaliações pendentes, aprovar avaliações, excluir avaliações.
 */
const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Esquema Zod para validar dados de submissão de avaliação.
 * A nota deve estar entre 1 e 5, comentário é opcional.
 */
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional().nullable(),
});

// Listar avaliações de um produto (Público)
router.get('/:productId', async (c) => {
  const db = c.get('db');
  const productId = parseInt(c.req.param('productId'));
  
  if (isNaN(productId)) return jsonError(c, 400, 'ID do produto inválido');
  
  try {
    const data = await reviewService.getProductReviews(db, productId);
    return c.json(data);
  } catch (error) {
    return jsonError(c, 500, 'Erro ao buscar avaliações');
  }
});

// Submeter avaliação (Autenticado)
router.post(
  '/:productId',
  authMiddleware,
  zValidator('json', reviewSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const productId = parseInt(c.req.param('productId'));
    
    if (isNaN(productId)) return jsonError(c, 400, 'ID do produto inválido');
    if (!user) return jsonError(c, 401, 'Não autorizado');

    try {
      const payload = c.req.valid('json');
      const review = await reviewService.submitReview(db, {
        productId,
        userId: parseInt(user.id),
        rating: payload.rating,
        comment: payload.comment || undefined,
      });
      
      return c.json({
        message: 'Avaliação enviada com sucesso! Ela passará por aprovação em breve.',
        review
      }, 201);
    } catch (error) {
      return jsonError(c, 500, 'Erro ao enviar avaliação');
    }
  }
);

// --- Rotas Administrativas ---

// Listar avaliações pendentes
router.get('/pending', authMiddleware, adminOnly, async (c) => {
  const db = c.get('db');
  try {
    const reviews = await reviewService.getPendingReviews(db);
    return c.json(reviews);
  } catch (error) {
    return jsonError(c, 500, 'Erro ao buscar avaliações pendentes');
  }
});

// Aprovar avaliação
router.post('/approve/:id', authMiddleware, adminOnly, async (c) => {
  const db = c.get('db');
  const id = parseInt(c.req.param('id'));
  
  if (isNaN(id)) return jsonError(c, 400, 'ID inválido');
  
  try {
    const success = await reviewService.approveReview(db, id);
    if (!success) return jsonError(c, 404, 'Avaliação não encontrada');
    return c.json({ message: 'Avaliação aprovada com sucesso' });
  } catch (error) {
    return jsonError(c, 500, 'Erro ao aprovar avaliação');
  }
});

// Excluir avaliação
router.delete('/:id', authMiddleware, adminOnly, async (c) => {
  const db = c.get('db');
  const id = parseInt(c.req.param('id'));
  
  if (isNaN(id)) return jsonError(c, 400, 'ID inválido');
  
  try {
    const success = await reviewService.deleteReview(db, id);
    if (!success) return jsonError(c, 404, 'Avaliação não encontrada');
    return c.json({ message: 'Avaliação excluída com sucesso' });
  } catch (error) {
    return jsonError(c, 500, 'Erro ao excluir avaliação');
  }
});

/**
 * Exportação padrão do roteador de gerenciamento de avaliações.
 * Endpoints:
 * - GET /:productId - Lista avaliações aprovadas de um produto (Público)
 * - POST /:productId - Submete uma avaliação para um produto (Autenticado)
 * - GET /pending - Lista avaliações pendentes para aprovação (Apenas admin)
 * - POST /approve/:id - Aprova uma avaliação pendente (Apenas admin)
 * - DELETE /:id - Exclui uma avaliação (Apenas admin)
 */
export default router;
