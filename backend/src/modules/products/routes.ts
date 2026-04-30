import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminOnly } from '../../core/middleware/auth';
import { productCreateSchema, productUpdateSchema } from '../../core/domain/schemas';
import { isValidId } from '../../core/utils/normalize';
import { jsonError, setNoStore, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import * as productService from './service';
import { Bindings, Variables } from '../../core/types';
import { logSystemEvent } from '../system/logService';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  const db = c.get('db');
  const limitQuery = c.req.query('limit');
  const offsetQuery = c.req.query('offset');
  const limit = Math.min(parseInt(limitQuery || '') || 50, 100);
  const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);

  const products = await productService.getProducts(db, limit, offset, c.env, c.executionCtx);

  setNoStore(c as any);
  return c.json(products);
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  const product = await productService.getProduct(db, id, c.env, c.executionCtx);

  if (!product) {
    return jsonError(c, 404, 'Produto não encontrado');
  }

  setNoStore(c as any);
  return c.json(product);
});

router.post(
  '/',
  zValidator('json', productCreateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    try {
      const payload = c.req.valid('json');
      const product = await productService.createProduct(db, payload, c.env, c.executionCtx);
      return c.json(product, 201);
    } catch (error: any) {
      if (error.type === 'UNIQUE_VIOLATION') {
        return jsonError(c, 409, `${error.label} já cadastrado`);
      }
      const errorId = crypto.randomUUID().split('-')[0];
      logger.error(`Erro ao cadastrar produto [${errorId}]`, error);
      
      logSystemEvent(db, c.env, 'error', `Erro ao cadastrar produto [${errorId}]: ${error.message}`, {
        payload: c.req.valid('json'),
        errorId
      }, error, c.executionCtx);

      return jsonError(c, 500, 'Erro ao cadastrar o novo produto.', { errorId });
    }
  }
);

router.put(
  '/:id',
  zValidator('json', productUpdateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');
    if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

    try {
      const payload = c.req.valid('json');
      const updatedProduct = await productService.updateProduct(db, id, payload, c.env, c.executionCtx);
      return c.json(updatedProduct);
    } catch (error: any) {
      if (error.type === 'UNIQUE_VIOLATION') {
        return jsonError(c, 409, `${error.label} já cadastrado`);
      }
      if (error.type === 'NOT_FOUND') {
        return jsonError(c, 404, 'Produto não encontrado');
      }
      const errorId = crypto.randomUUID().split('-')[0];
      logger.error(`Erro ao editar produto [${errorId}]`, error);

      logSystemEvent(db, c.env, 'error', `Erro ao editar produto [${errorId}]: ${error.message}`, {
        id,
        payload: c.req.valid('json'),
        errorId
      }, error, c.executionCtx);

      return jsonError(c, 500, 'Erro ao salvar as edições do produto.', { errorId });
    }
  }
);

router.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  try {
    const success = await productService.deleteProduct(db, id, c.env, c.executionCtx);
    if (!success) {
      return jsonError(c, 404, 'Produto não encontrado');
    }
    return c.json({ message: 'Produto excluído' });
  } catch (error: any) {
    const errorId = crypto.randomUUID().split('-')[0];
    logger.error(`Erro ao excluir produto [${errorId}]`, error);
    
    logSystemEvent(db, c.env, 'error', `Erro ao excluir produto [${errorId}]: ${error.message}`, {
      id,
      errorId
    }, error, c.executionCtx);

    return jsonError(c, 500, 'Erro ao excluir o produto.', { errorId });
  }
});

export default router;
