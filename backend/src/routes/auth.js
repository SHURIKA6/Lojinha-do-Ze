import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = new Hono();

// POST /api/auth/login
router.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: 'E-mail e senha são obrigatórios' }, 400);
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return c.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
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


