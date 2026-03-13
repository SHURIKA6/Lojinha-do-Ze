import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import config from '../config.js';
import { cleanOptionalString } from '../utils/normalize.js';

const router = new Hono();

const loginSchema = z.object({
  email: z.string().trim().min(1, 'E-mail ou telefone é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// POST /api/auth/login
router.post('/login', loginLimiter, zValidator('json', loginSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
}), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    const identifier = email.trim();

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR phone = $1 LIMIT 1',
      [identifier]
    );
    if (rows.length === 0) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    }

    const user = rows[0];
    if (!user.password) {
      return c.json({
        error: 'Esse cadastro precisa de uma senha. Solicite uma senha temporária para a loja.',
      }, 403);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        avatar: user.avatar,
        is_temporary_password: user.is_temporary_password 
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({ error: 'Erro interno' }, 500);
  }
});

const phoneSchema = z.object({
  phone: z.string().min(8, 'Telefone é obrigatório'),
  name: z.string().optional()
});

// POST /api/auth/phone
router.post('/phone', loginLimiter, zValidator('json', phoneSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const { name } = c.req.valid('json');
    const cleanName = cleanOptionalString(name);

    return c.json({
      error: cleanName
        ? 'Login por telefone foi desativado por segurança. Use telefone ou e-mail com senha.'
        : 'Login por telefone sem senha foi desativado por segurança. Solicite uma senha temporária para a loja.',
    }, 403);
  } catch (err) {
    console.error('Phone Auth error:', err);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, zValidator('json', changePasswordSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
}), async (c) => {
  try {
    const authUser = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json');

    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [authUser.id]);
    if (rows.length === 0) return c.json({ error: 'Usuário não encontrado' }, 404);
    if (!rows[0].password) {
      return c.json({ error: 'Esse cadastro ainda não possui senha definida' }, 400);
    }

    const validPassword = await bcrypt.compare(currentPassword, rows[0].password);
    if (!validPassword) {
      return c.json({ error: 'Senha atual incorreta' }, 400);
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, is_temporary_password = false WHERE id = $2', [hashedNew, authUser.id]);

    return c.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    console.error('Change password error:', err);
    return c.json({ error: 'Erro interno' }, 500);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { rows } = await pool.query(
      'SELECT id, name, email, role, phone, cpf, address, avatar, created_at FROM users WHERE id = $1',
      [user.id]
    );
    if (rows.length === 0) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }
    return c.json(rows[0]);
  } catch (err) {
    return c.json({ error: 'Erro interno' }, 500);
  }
});

export default router;


