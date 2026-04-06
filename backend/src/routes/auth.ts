import { Hono } from 'hono';
import { clearSessionCookies, destroySession, issueSession, resolveSession } from '../services/authService';
import { jsonError, jsonSuccess } from '../utils/http';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { authMiddleware, csrfMiddleware } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';
import { isUserRole } from '../domain/roles';
import { Bindings, Variables } from '../types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/auth/login
 * Autentica o usuário e cria uma sessão
 */
router.post('/login', loginLimiter, async (c) => {
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

    const userRow = rows[0];
    if (!userRow) {
      logger.warn('Tentativa de login: usuário não encontrado', { identifier });
      return jsonError(c, 401, 'Credenciais inválidas');
    }

    const validPassword = userRow.password ? await bcrypt.compare(passwordTrim, userRow.password) : false;
    if (!validPassword) {
      logger.warn('Tentativa de login: senha incorreta', { userId: userRow.id });
      return jsonError(c, 401, 'Credenciais inválidas');
    }

    if (!isUserRole(userRow.role)) {
      logger.error('Tentativa de login com cargo inválido persistido', new Error('Invalid stored role'), {
        userId: userRow.id,
        role: userRow.role,
      });
      return jsonError(c, 500, 'Usuário com cargo inválido. Corrija os dados da conta.');
    }

    const { csrfToken } = await issueSession(c, db, String(userRow.id));
    
    // Busca usuário completo para o estado inicial
    const { rows: fullUserRows } = await db.query(
      'SELECT id, name, email, role, phone, cpf, address, avatar, created_at FROM users WHERE id = $1',
      [userRow.id]
    );

    const user = {
      ...fullUserRows[0],
      createdAt: new Date(fullUserRows[0].created_at)
    };
    
    const isEasterEgg = identifier.toLowerCase() === (c.env?.EASTER_EGG_IDENTIFIER || 'none');
    
    return jsonSuccess(c, {
      user,
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
 * Retorna o perfil do usuário logado baseado na sessão do cookie
 */
router.get('/me', async (c) => {
  const db = c.get('db');
  const client = await db.connect();
  try {
    const session = await resolveSession(c, client);
    
    if (!session) {
      return jsonError(c, 401, 'Não autenticado');
    }

    return jsonSuccess(c, {
      user: session.user,
      csrfToken: session.csrfToken
    });
  } catch (error) {
    logger.error('Erro ao verificar sessão', error);
    return jsonError(c, 500, 'Erro interno ao verificar sessão');
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
