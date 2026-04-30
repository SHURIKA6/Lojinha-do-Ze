import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import * as authService from './service';
import { jsonError, jsonSuccess, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { authMiddleware, csrfMiddleware } from '../../core/middleware/auth';
import { hashPassword } from '../../core/utils/crypto';
import { loginLimiter } from '../../core/middleware/rateLimit';
import { loginSchema } from '../../core/domain/schemas';
import { Bindings, Variables } from '../../core/types';
import { logSystemEvent } from '../system/logService';


const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();



/**
 * POST /api/auth/login
 * Autentica o usuário e cria uma sessão
 */
router.post(
  '/login',
  loginLimiter,
  zValidator('json', loginSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const { email, identifier, password } = c.req.valid('json');
    const loginId = (email || identifier) as string;

    try {
      logger.info('[LOGIN] Step 1: Starting authenticate', { loginId });
      const user = await authService.authenticate(db, loginId, password);
      logger.info('[LOGIN] Step 2: authenticate OK', { userId: user.id });

      // PERF: Usamos o driver HTTP (db) em vez do Pool (db.connect) pois é mais rápido
      // para operações isoladas em Workers e evita overhead de handshake WebSocket.
      const { csrfToken } = await authService.issueSession(c, db, user);
      logger.info('[LOGIN] Step 3: issueSession OK');

      return jsonSuccess(c, {
        user: { id: user.id, role: user.role },
        csrfToken,
      });
    } catch (error: any) {
      const errorId = crypto.randomUUID().split('-')[0];
      const message = error.message || 'Erro desconhecido';

      if (message === 'Credenciais inválidas') {
        return jsonError(c, 401, message);
      }

      if (message.includes('bloqueada') || message.includes('tentativas falhas')) {
        return jsonError(c, 403, message);
      }

      logger.error(`[LOGIN] FALHA: ${message}`, error, { 
        errorId,
        loginId: loginId,
        stack: error.stack
      });

      // Persiste no banco para auditoria
      await logSystemEvent(db, c.env, 'error', `Falha no Login [${errorId}]: ${message}`, {
        loginId,
        errorId,
        path: c.req.path
      }, error).catch(err => logger.error('Falha ao logar erro de login no banco', err));
      
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
  await authService.destroySession(c, db);
  return jsonSuccess(c, { message: 'Logout realizado com sucesso' });
});

/**
 * POST /api/auth/setup-password
 * Ativa a conta usando um convite e define a nova senha
 */
router.post('/setup-password', async (c) => {
  const db = c.get('db');
  const payload = await c.req.json();
  const { token, code, password, confirmPassword } = payload;

  if (!password || password !== confirmPassword || password.length < 6) {
    return jsonError(c, 400, 'Senhas não coincidem ou são muito curtas.');
  }

  try {
    const result = await authService.consumePasswordSetupInvite(db, { token, code });
    if (!result) {
      return jsonError(c, 400, 'Convite inválido ou expirado.');
    }

    const hashed = await hashPassword(password);
    await db.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, result.user.id]);

    const { csrfToken } = await authService.issueSession(c, db, result.user);
    return jsonSuccess(c, { user: result.user, csrfToken });
  } catch (error: any) {
    const errorId = crypto.randomUUID().split('-')[0];
    logger.error(`Erro no setup-password [${errorId}]`, error);
    
    await logSystemEvent(db, c.env, 'error', `Erro no Setup Password [${errorId}]: ${error.message}`, {
      token,
      code,
      errorId
    }, error).catch(err => logger.error('Falha ao logar erro de setup-password no banco', err));

    return jsonError(c, 500, 'Não foi possível ativar sua conta no momento.', { errorId });
  }
});

/**
 * GET /api/auth/me
 * Retorna os dados do usuário autenticado
 */
router.get('/me', async (c) => {
  const db = c.get('db');
  // PERF: Usa db diretamente (HTTP driver) em vez de db.connect() (Pool/WebSocket)
  const session = await authService.resolveSession(c, db);
  if (!session) {
    return jsonError(c, 401, 'Não autenticado');
  }
  return jsonSuccess(c, { user: session.user, csrfToken: session.csrfToken });
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
