import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminOnly } from '../../core/middleware/auth';
import { productCreateSchema, productUpdateSchema } from '../../core/domain/schemas';
import { isValidId } from '../../core/utils/normalize';
import { jsonError, setNoStore, validationError } from '../../core/utils/http';
import * as productService from './service';
import { Bindings, Variables } from '../../core/types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  const db = c.get('db');
  const limitQuery = c.req.query('limit');
  const offsetQuery = c.req.query('offset');
  const limit = Math.min(parseInt(limitQuery || '') || 50, 100);
  const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);

  const products = await productService.getProducts(db, limit, offset);

  setNoStore(c as any);
  return c.json(products);
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  const product = await productService.getProduct(db, id);

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
      const product = await productService.createProduct(db, payload);
      return c.json(product, 201);
    } catch (error: any) {
      if (error.type === 'UNIQUE_VIOLATION') {
        return jsonError(c, 409, `${error.label} já cadastrado`);
      }
      return jsonError(c, 500, 'Erro ao cadastrar o novo produto.');
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
      const updatedProduct = await productService.updateProduct(db, id, payload);
      return c.json(updatedProduct);
    } catch (error: any) {
      if (error.type === 'UNIQUE_VIOLATION') {
        return jsonError(c, 409, `${error.label} já cadastrado`);
      }
      if (error.type === 'NOT_FOUND') {
        return jsonError(c, 404, 'Produto não encontrado');
      }
      return jsonError(c, 500, 'Erro ao salvar as edições do produto.');
    }
  }
);

router.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  try {
    const success = await productService.deleteProduct(db, id);
    if (!success) {
      return jsonError(c, 404, 'Produto não encontrado');
    }
    return c.json({ message: 'Produto excluído' });
  } catch (error) {
    return jsonError(c, 500, 'Erro ao excluir o produto.');
  }
});

export default router;
