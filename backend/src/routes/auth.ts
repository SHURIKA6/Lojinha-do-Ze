import { Hono } from 'hono';
import { clearSessionCookies, destroySession, issueSession, resolveSession } from '../services/authService';
import { jsonError, jsonSuccess } from '../utils/http';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { authMiddleware, csrfMiddleware } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';
import { isUserRole } from '../domain/roles';
import { Bindings, Variables } from '../types';
import { SetupPasswordSchema, ChangePasswordSchema } from '../domain/schemas';

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

  const identifier = String(email).trim();
  const passwordTrim = String(password).trim();

  try {
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

    if (!fullUserRows[0]) {
      logger.error('Login process fail: full user record vanished', new Error('User vanished'), { userId: userRow.id });
      return jsonError(c, 500, 'Erro ao recuperar dados do usuário');
    }

    const { created_at, ...userData } = fullUserRows[0];
    const user = {
      ...userData,
      createdAt: created_at ? new Date(created_at) : new Date(),
    };
    
    const easterEggId = c.env?.EASTER_EGG_IDENTIFIER;
    const isEasterEgg = Boolean(easterEggId) && identifier.toLowerCase() === easterEggId?.toLowerCase();
    
    return jsonSuccess(c, {
      user,
      csrfToken,
      easterEgg: isEasterEgg,
    });
  } catch (error: any) {
    logger.error('Erro crítico no processamento do login', error, {
      identifier: identifier?.substring(0, 3) + '***', // Logging seguro
      errorStack: error?.stack 
    });
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


/**
 * POST /api/auth/setup-password
 * Define a senha para a primeira vez (Apenas Administradores)
 */
router.post('/setup-password', authMiddleware, async (c) => {
  const session = c.get('session');
  const db = c.get('db');

  if (session.user.role !== 'admin') {
    return jsonError(c, 403, 'Apenas administradores podem configurar senhas de usuários');
  }

  try {
    const body = await c.req.json();
    const validated = SetupPasswordSchema.parse(body);

    const { rows } = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [validated.userId]
    );
    const user = rows[0];

    if (!user) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    if (user.password) {
      return jsonError(c, 400, 'A senha já foi definida. Use /change-password para alterá-la');
    }

    const hashedPassword = await bcrypt.hash(validated.newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, validated.userId]
    );

    return jsonSuccess(c, { message: 'Senha definida com sucesso' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return jsonError(c, 400, 'Dados de entrada inválidos', error.errors);
    }
    logger.error('Erro ao definir senha', error);
    return jsonError(c, 500, 'Erro interno ao definir senha');
  }
});

/**
 * POST /api/auth/change-password
 * Altera a senha do usuário autenticado
 */
router.post('/change-password', authMiddleware, async (c) => {
  const session = c.get('session');
  const db = c.get('db');
  let body: any;
  try {
    body = await c.req.json();
  } catch (e) {
    return jsonError(c, 400, 'Corpo da requisição inválido');
  }

  const { oldPassword, newPassword, confirmPassword } = body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return jsonError(c, 400, 'Senha atual, nova senha e confirmação são obrigatórias');
  }

  if (newPassword !== confirmPassword) {
    return jsonError(c, 400, 'As novas senhas não coincidem');
  }

  try {
    const { rows } = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [session.user.id]
    );
    const user = rows[0];

    if (!user || !user.password) {
      return jsonError(c, 400, 'Senha não configurada ou usuário não encontrado');
    }

    const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidOldPassword) {
      return jsonError(c, 401, 'Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, session.user.id]
    );

    return jsonSuccess(c, { message: 'Senha alterada com sucesso' });
  } catch (error) {
    logger.error('Erro ao alterar senha', error);
    return jsonError(c, 500, 'Erro interno ao alterar senha');
  }
});

export default router;
