import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = new Hono();

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
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

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
      return c.json({ error: 'Erro interno no Servidor' }, 500);
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
      secret,
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

// POST /api/auth/phone (Frictionless customer login/register via Phone)
router.post('/phone', loginLimiter, zValidator('json', phoneSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const { phone, name } = c.req.valid('json');

    // 1. Check if user exists by phone
    let { rows } = await pool.query("SELECT * FROM users WHERE phone = $1 AND role = 'customer'", [phone]);
    let user = rows[0];

    // 2. If not found, create new user (requires name)
    if (!user) {
      if (!name) return c.json({ error: 'Primeiro acesso: informe seu nome completo', requireName: true }, 404);
      
      const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const insertGroup = await pool.query(
        "INSERT INTO users (name, phone, role, is_temporary_password, avatar) VALUES ($1, $2, 'customer', true, $3) RETURNING *",
        [name, phone, avatar]
      );
      user = insertGroup.rows[0];
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return c.json({ error: 'Erro de Servidor: Sessão indisponível' }, 500);

    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        phone: user.phone, 
        role: user.role, 
        avatar: user.avatar 
      },
      secret,
      { expiresIn: '30d' } // Clients stay logged in longer
    );

    const { password: _, ...safeUser } = user;
    return c.json({ token, user: safeUser });
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


