import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, csrfMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import {
  changePasswordSchema,
  loginSchema,
  passwordSetupSchema,
} from '../domain/schemas.js';
import {
  clearSessionCookies,
  consumePasswordSetupInvite,
  destroySession,
  issueSession,
  resolveSession,
} from '../services/authService.js';
import { loginLimiter, setupPasswordLimiter } from '../middleware/rateLimit.js';
import { jsonError, setNoStore, validationError } from '../utils/http.js';

router.post(
  '/login',
  loginLimiter,
  zValidator('json', loginSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      const payload = c.req.valid('json');
      const identifier = normalizeEmail(payload.identifier || payload.email) || payload.identifier?.trim();
      const phoneDigits = normalizePhoneDigits(payload.identifier || payload.email || '');

      const { rows } = await client.query(
        `SELECT *
         FROM users
         WHERE LOWER(COALESCE(email, '')) = LOWER($1)
            OR REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $2
         LIMIT 1`,
        [identifier || '', phoneDigits]
      );

      if (rows.length === 0) {
        // Timing attack mitigation: always perform a bcrypt comparison
        await bcrypt.compare(payload.password, '$2a$12$L7R23YQ6VvW.vG6X7Zf9q.nNl8y6R6R6R6R6R6R6R6R6R6R6R6R6');
        setNoStore(c);
        return jsonError(c, 401, 'E-mail, telefone ou senha incorretos');
      }

      const user = rows[0];
      if (!user.password) {
        await bcrypt.compare(payload.password, '$2a$12$L7R23YQ6VvW.vG6X7Zf9q.nNl8y6R6R6R6R6R6R6R6R6R6R6R6R6');
        setNoStore(c);
        return jsonError(c, 401, 'E-mail, telefone ou senha incorretos');
      }

      const validPassword = await bcrypt.compare(payload.password, user.password);
      if (!validPassword) {
        setNoStore(c);
        return jsonError(c, 401, 'E-mail, telefone ou senha incorretos');
      }

      await issueSession(c, client, user.id);
      setNoStore(c);

      return c.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          cpf: user.cpf,
          address: user.address,
          avatar: user.avatar,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    } finally {
      client.release();
    }
  }
);

router.post('/logout', optionalAuthMiddleware, async (c) => {
  const db = c.get('db');
  const client = await db.connect();

  try {
    await destroySession(c, client);
    setNoStore(c);
    return c.json({ message: 'Sessão encerrada com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    clearSessionCookies(c);
    return jsonError(c, 500, 'Erro interno no servidor');
  } finally {
    client.release();
  }
});

router.post(
  '/setup-password',
  setupPasswordLimiter,
  zValidator('json', passwordSetupSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const payload = c.req.valid('json');
      const invite = await consumePasswordSetupInvite(client, {
        token: payload.token,
        code: payload.code,
      });

      if (!invite?.user) {
        await client.query('ROLLBACK');
        setNoStore(c);
        return jsonError(c, 400, 'Convite inválido, expirado ou já utilizado');
      }

      const passwordHash = await bcrypt.hash(payload.password, 12);
      const { rows } = await client.query(
        `UPDATE users
         SET password = $1, is_temporary_password = false, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, email, role, phone, cpf, address, avatar, created_at`,
        [passwordHash, invite.user.id]
      );

      await issueSession(c, client, invite.user.id);
      await client.query('COMMIT');
      setNoStore(c);

      return c.json({ user: rows[0] });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Setup password error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    } finally {
      client.release();
    }
  }
);

router.post(
  '/change-password',
  authMiddleware,
  csrfMiddleware,
  zValidator('json', changePasswordSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const session = await resolveSession(c, client);
      if (!session?.user) {
        await client.query('ROLLBACK');
        setNoStore(c);
        return jsonError(c, 401, 'Sessão inválida ou expirada');
      }

      const payload = c.req.valid('json');
      const { rows } = await client.query('SELECT password FROM users WHERE id = $1', [
        session.user.id,
      ]);

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return jsonError(c, 404, 'Usuário não encontrado');
      }

      const validPassword = await bcrypt.compare(payload.currentPassword, rows[0].password || '');
      if (!validPassword) {
        await client.query('ROLLBACK');
        setNoStore(c);
        return jsonError(c, 400, 'Senha atual incorreta');
      }

      const newHash = await bcrypt.hash(payload.newPassword, 12);
      await client.query(
        `UPDATE users
         SET password = $1, is_temporary_password = false, updated_at = NOW()
         WHERE id = $2`,
        [newHash, session.user.id]
      );

      await destroySession(c, client);
      await issueSession(c, client, session.user.id);
      await client.query('COMMIT');
      setNoStore(c);

      return c.json({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Change password error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    } finally {
      client.release();
    }
  }
);

router.get('/me', authMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const user = c.get('user');
    const { rows } = await db.query(
      `SELECT id, name, email, role, phone, cpf, address, avatar, created_at
       FROM users
       WHERE id = $1`,
      [user.id]
    );

    if (rows.length === 0) {
      clearSessionCookies(c);
      setNoStore(c);
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    setNoStore(c);
    return c.json(rows[0]);
  } catch (error) {
    console.error('Auth me error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

export default router;
