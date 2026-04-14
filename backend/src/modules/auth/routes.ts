import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as authService from './service';
import { jsonError, jsonSuccess, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { authMiddleware, csrfMiddleware } from '../../core/middleware/auth';
import { loginSchema } from '../../core/domain/schemas';
import { Bindings, Variables } from '../../core/types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/auth/login
 * Autentica o usuário e cria uma sessão
 */
router.post(
  '/login',
  zValidator('json', loginSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const { email, identifier, password } = c.req.valid('json');
    const loginId = (email || identifier) as string;

    try {
      const user = await authService.authenticate(db, loginId, password);

      const client = await db.connect();
      try {
        const { csrfToken } = await authService.issueSession(c, client, user.id);

        return jsonSuccess(c, {
          user: { id: user.id, role: user.role },
          csrfToken,
        });
      } finally {
        try {
          client.release();
        } catch {}
      }
    } catch (error: any) {
      if (error.message === 'Credenciais inválidas') {
        return jsonError(c, 401, error.message);
      }
      
      const errorId = crypto.randomUUID().split('-')[0];
      logger.error(`Erro crítico no processamento do login [${errorId}]`, {
        error: error,
        message: error.message,
        stack: error.stack,
        loginId: loginId
      });
      
      return jsonError(c, 500, 'Erro interno ao processar login', { errorId });
    }
  }
);

/**
 * POST /api/auth/logout
 * Destrói a sessão atual
 */
router.post('/logout', async (c) => {
  const db = c.get('db');
  const client = await db.connect();
  try {
    await authService.destroySession(c, client);
    return jsonSuccess(c, { message: 'Logout realizado com sucesso' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/auth/me
 * Retorna os dados do usuário autenticado
 */
router.get('/me', async (c) => {
  const db = c.get('db');
  const client = await db.connect();
  try {
    const session = await authService.resolveSession(c, client);
    if (!session) {
      return jsonError(c, 401, 'Não autenticado');
    }
    return jsonSuccess(c, { user: session.user, csrfToken: session.csrfToken });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/refresh-csrf
 * Atualiza o token CSRF da sessão
 */
router.post('/refresh-csrf', authMiddleware, async (c) => {
  const session = c.get('session');
  return jsonSuccess(c, { csrfToken: session.csrfToken });
});

export default router;
