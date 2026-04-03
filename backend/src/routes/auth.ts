import { Hono } from 'hono';
import { clearSessionCookies, destroySession, issueSession, resolveSession } from '../services/authService';
import { jsonError, jsonSuccess } from '../utils/http';
import { sha256Hex } from '../utils/crypto';
import { authMiddleware, csrfMiddleware } from '../middleware/auth';
import { Bindings, Variables } from '../types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/auth/login
 * Autentica o usuário e cria uma sessão
 */
router.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = c.get('db');

  if (!email || !password) {
    return jsonError(c, 400, 'E-mail e senha são obrigatórios');
  }

  const { rows } = await db.query(
    'SELECT id, password_hash, role FROM users WHERE email = $1 AND active = true',
    [email.toLowerCase()]
  );

  const user = rows[0];
  if (!user) {
    return jsonError(c, 401, 'Credenciais inválidas');
  }

  const passwordHash = await sha256Hex(password);
  if (passwordHash !== user.password_hash) {
    return jsonError(c, 401, 'Credenciais inválidas');
  }

  const client = await db.connect();
  try {
    const { csrfToken } = await issueSession(c, client, user.id);
    return jsonSuccess(c, {
      user: { id: user.id, role: user.role },
      csrfToken,
    });
  } finally {
    if (client.release) client.release();
  }
});

/**
 * POST /api/auth/logout
 * Destrói a sessão atual
 */
router.post('/logout', async (c) => {
  const db = c.get('db');
  const client = await db.connect();
  try {
    await destroySession(c, client);
    return jsonSuccess(c, { message: 'Logout realizado com sucesso' });
  } finally {
    if (client.release) client.release();
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
    const session = await resolveSession(c, client);
    if (!session) {
      return jsonError(c, 401, 'Não autenticado');
    }
    return jsonSuccess(c, { user: session.user, csrfToken: session.csrfToken });
  } finally {
    if (client.release) client.release();
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
