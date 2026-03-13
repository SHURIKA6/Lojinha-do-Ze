import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  cleanOptionalString,
  isUniqueViolation,
  uniqueFieldLabel,
} from '../utils/normalize.js';

const router = new Hono();
const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// All routes here require authentication
router.use('*', authMiddleware);

// User profile update
router.put('/', zValidator('json', profileSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
}), async (c) => {
  try {
    const { name, email, phone, address } = c.req.valid('json');
    const user = c.get('user');
    const cleanName = cleanOptionalString(name);
    const cleanEmail = cleanOptionalString(email);
    const cleanPhone = cleanOptionalString(phone);
    const cleanAddress = cleanOptionalString(address);
    const avatar = cleanName
      ? cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : undefined;
    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), email=$2,
       phone=$3, address=$4, avatar=COALESCE($5,avatar), updated_at=NOW()
       WHERE id=$6 RETURNING id, name, email, phone, cpf, address, avatar, role, created_at`,
      [cleanName, cleanEmail, cleanPhone, cleanAddress, avatar, user.id]
    );
    return c.json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: `${uniqueFieldLabel(err)} já cadastrado` }, 409);
    }
    console.error('Profile PUT error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;
