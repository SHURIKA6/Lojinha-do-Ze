import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import {
  cleanOptionalString,
  isUniqueViolation,
  uniqueFieldLabel,
} from '../utils/normalize.js';

const router = new Hono();

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  if (!cleanOptionalString(data.email) && !cleanOptionalString(data.phone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe ao menos um e-mail ou telefone para acesso',
      path: ['phone'],
    });
  }
});

// Securing all customer routes (Only admins can view or modify customer data via this endpoint)
router.use('/*', authMiddleware, adminOnly);

// GET /api/customers
router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const { rows } = await db.query(
      "SELECT id, name, email, phone, cpf, address, notes, avatar, created_at FROM users WHERE role = 'customer' ORDER BY name"
    );
    return c.json(rows);
  } catch (err) {
    console.error('Customers GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// GET /api/customers/:id
router.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const { rows } = await db.query(
      "SELECT id, name, email, phone, cpf, address, notes, avatar, created_at FROM users WHERE id = $1 AND role = 'customer'",
      [id]
    );
    if (rows.length === 0) return c.json({ error: 'Cliente não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Customers GET /:id error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/customers
router.post('/', zValidator('json', customerSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const db = c.get('db');
    const { name, email, phone, cpf, address, notes } = c.req.valid('json');
    const cleanName = name.trim();
    const cleanEmail = cleanOptionalString(email);
    const cleanPhone = cleanOptionalString(phone);
    const cleanCpf = cleanOptionalString(cpf);
    const cleanAddress = cleanOptionalString(address);
    const cleanNotes = cleanOptionalString(notes);
    
    // Generate a secure random password if none is provided during registration
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const password = await bcrypt.hash(tempPassword, 10);
    
    const avatar = cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, notes, avatar)
       VALUES ($1, $2, $3, true, 'customer', $4, $5, $6, $7, $8) RETURNING id, name, email, phone, cpf, address, notes, avatar, created_at`,
      [cleanName, cleanEmail, password, cleanPhone, cleanCpf, cleanAddress, cleanNotes, avatar]
    );
    const createdUser = rows[0];
    createdUser.generatedPassword = tempPassword;
    return c.json(createdUser, 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: `${uniqueFieldLabel(err)} já cadastrado` }, 409);
    }
    console.error('Customer POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PUT /api/customers/:id
router.put('/:id', zValidator('json', customerSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const { name, email, phone, cpf, address, notes } = c.req.valid('json');
    const cleanName = name.trim();
    const cleanEmail = cleanOptionalString(email);
    const cleanPhone = cleanOptionalString(phone);
    const cleanCpf = cleanOptionalString(cpf);
    const cleanAddress = cleanOptionalString(address);
    const cleanNotes = cleanOptionalString(notes);
    const avatar = cleanName ? cleanName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : undefined;
    const { rows } = await db.query(
      `UPDATE users SET name=$1, email=$2, phone=$3,
       cpf=$4, address=$5, notes=$6,
       avatar=$7, updated_at=NOW()
       WHERE id=$8 AND role='customer'
       RETURNING id, name, email, phone, cpf, address, notes, avatar, created_at`,
      [cleanName, cleanEmail, cleanPhone, cleanCpf, cleanAddress, cleanNotes, avatar, id]
    );
    if (rows.length === 0) return c.json({ error: 'Cliente não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: `${uniqueFieldLabel(err)} já cadastrado` }, 409);
    }
    console.error('Customers PUT error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PATCH /api/customers/:id/reset-password
router.patch('/:id/reset-password', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const { rows } = await db.query(
      `UPDATE users
       SET password = $1, is_temporary_password = true, updated_at = NOW()
       WHERE id = $2 AND role = 'customer'
       RETURNING id, name, email, phone, cpf, address, notes, avatar, created_at`,
      [hashedPassword, id]
    );

    if (rows.length === 0) {
      return c.json({ error: 'Cliente não encontrado' }, 404);
    }

    return c.json({
      ...rows[0],
      generatedPassword: tempPassword,
    });
  } catch (err) {
    console.error('Customers reset-password error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const { rowCount } = await db.query("DELETE FROM users WHERE id = $1 AND role = 'customer'", [id]);
    if (rowCount === 0) return c.json({ error: 'Cliente não encontrado' }, 404);
    return c.json({ message: 'Cliente excluído' });
  } catch (err) {
    console.error('Customers DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;


