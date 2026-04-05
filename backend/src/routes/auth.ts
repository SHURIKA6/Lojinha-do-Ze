import { Hono } from 'hono';
import { clearSessionCookies, destroySession, issueSession, resolveSession } from '../services/authService';
import { jsonError, jsonSuccess } from '../utils/http';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { authMiddleware, csrfMiddleware } from '../middleware/auth';
import { Bindings, Variables } from '../types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/auth/login
 * Autentica o usuário e cria uma sessão
 */
router.post('/login', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch (e) {
    return jsonError(c, 400, 'Corpo da requisição inválido');
  }

  const email = (body.email || body.identifier) as string;
  const password = body.password as string;
  const db = c.get('db');

  if (!email || !password) {
    return jsonError(c, 400, 'Identificador e senha são obrigatórios');
  }

  try {
    const identifier = String(email).trim();
    const passwordTrim = String(password).trim();

    // Normaliza identificador (remove caracteres especiais de telefone ou CPF)
    const onlyDigits = identifier.replace(/\D/g, '');
    
    // Busca usuário por e-mail, telefone ou CPF (tentando versões formatadas e apenas dígitos)
    const { rows } = await db.query(
      `SELECT id, password, role FROM users 
       WHERE LOWER(email) = LOWER($1) 
          OR phone = $1 OR phone = $2 
          OR cpf = $1 OR cpf = $2 
       LIMIT 1`,
      [identifier, onlyDigits]
    );

    const user = rows[0];
    if (!user) {
      logger.warn('Tentativa de login: usuário não encontrado', { identifier });
      return jsonError(c, 401, 'Credenciais inválidas');
    }

    const validPassword = user.password ? await bcrypt.compare(passwordTrim, user.password) : false;
    if (!validPassword) {
      logger.warn('Tentativa de login: senha incorreta', { userId: user.id });
      return jsonError(c, 401, 'Credenciais inválidas');
    }

    const { csrfToken } = await issueSession(c, db, String(user.id));
    
    const isEasterEgg = identifier.toLowerCase() === 'teste@gmail.com';
    
    return jsonSuccess(c, {
      user: { id: user.id, role: user.role },
      csrfToken,
      easterEgg: isEasterEgg,
    });
  } catch (error) {
    logger.error('Erro no processamento do login', error);
    return jsonError(c, 500, 'Erro interno ao processar login');
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
