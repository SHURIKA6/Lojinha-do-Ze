import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const router = new Hono();

// GET /api/customers
router.get('/', async (c) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, phone, cpf, address, notes, avatar, created_at FROM users WHERE role = 'customer' ORDER BY name"
    );
    return c.json(rows);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/customers/:id
router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { rows } = await pool.query(
      "SELECT id, name, email, phone, cpf, address, notes, avatar, created_at FROM users WHERE id = $1 AND role = 'customer'",
      [id]
    );
    if (rows.length === 0) return c.json({ error: 'Cliente não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/customers
router.post('/', async (c) => {
  try {
    const { name, email, phone, cpf, address, notes } = await c.req.json();
    
    // Generate a secure random password if none is provided during registration
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const password = await bcrypt.hash(tempPassword, 10);
    
    const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, cpf, address, notes, avatar)
       VALUES ($1, $2, $3, 'customer', $4, $5, $6, $7, $8) RETURNING id, name, email, phone, cpf, address, notes, avatar, created_at`,
      [name, email || '', password, phone || '', cpf || '', address || '', notes || '', avatar]
    );
    return c.json(rows[0], 201);
  } catch (err) {
    console.error('Customer POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PUT /api/customers/:id
router.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, email, phone, cpf, address, notes } = await c.req.json();
    const avatar = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : undefined;
    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone),
       cpf=COALESCE($4,cpf), address=COALESCE($5,address), notes=COALESCE($6,notes),
       avatar=COALESCE($7,avatar), updated_at=NOW()
       WHERE id=$8 AND role='customer'
       RETURNING id, name, email, phone, cpf, address, notes, avatar, created_at`,
      [name, email, phone, cpf, address, notes, avatar, id]
    );
    if (rows.length === 0) return c.json({ error: 'Cliente não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1 AND role = 'customer'", [id]);
    if (rowCount === 0) return c.json({ error: 'Cliente não encontrado' }, 404);
    return c.json({ message: 'Cliente excluído' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default router;


