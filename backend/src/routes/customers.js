import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminOnly, authMiddleware, csrfMiddleware } from '../middleware/auth.js';
import { customerCreateSchema, customerUpdateSchema } from '../domain/schemas.js';
import { generatePasswordSetupInvite } from '../services/authService.js';
import {
  buildAvatar,
  cleanOptionalString,
  isUniqueViolation,
  normalizeCpfDigits,
  normalizeEmail,
  normalizePhoneDigits,
  uniqueFieldLabel,
} from '../utils/normalize.js';
import { jsonError, setNoStore, validationError } from '../utils/http.js';

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const limit = Math.min(parseInt(c.req.query('limit')) || 50, 100);
    const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);

    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await db.query(
      `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
       FROM users
       ORDER BY name
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    setNoStore(c);
    return c.json(rows);
  } catch (error) {
    console.error('Customers GET error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const { rows } = await db.query(
      `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    setNoStore(c);
    return c.json(rows[0]);
  } catch (error) {
    console.error('Customers GET /:id error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.get('/:id/orders', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const customerResult = await db.query(
      `SELECT id, phone
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (!customerResult.rows.length) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    const customer = customerResult.rows[0];
    const normalizedPhone = normalizePhoneDigits(customer.phone || '');

    const { rows } = await db.query(
      `SELECT id, customer_name, customer_phone, items, total, status, delivery_type, payment_method, created_at
       FROM orders
       WHERE customer_id = $1
          OR REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g') = $2
       ORDER BY created_at DESC`,
      [id, normalizedPhone]
    );

    setNoStore(c);
    return c.json(rows);
  } catch (error) {
    console.error('Customers GET /:id/orders error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.post(
  '/',
  csrfMiddleware,
  zValidator('json', customerCreateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const payload = c.req.valid('json');
      const cleanName = payload.name.trim();
      const cleanEmail = normalizeEmail(payload.email);
      const rawPhone = cleanOptionalString(payload.phone);
      const cleanPhone = rawPhone ? rawPhone.trim() : null;
      const cleanCpf = payload.cpf ? normalizeCpfDigits(payload.cpf) : null;
      const cleanAddress = cleanOptionalString(payload.address);
      const cleanNotes = cleanOptionalString(payload.notes);
      const avatar = buildAvatar(cleanName);

      const { rows } = await client.query(
        `INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, notes, avatar)
         VALUES ($1, $2, NULL, false, 'customer', $3, $4, $5, $6, $7)
         RETURNING id, name, email, phone, cpf, address, notes, avatar, role, created_at`,
        [cleanName, cleanEmail, cleanPhone, cleanCpf, cleanAddress, cleanNotes, avatar]
      );

      const createdCustomer = rows[0];
      const invite = await generatePasswordSetupInvite(c, client, createdCustomer);

      await client.query('COMMIT');
      setNoStore(c);

      return c.json(
        {
          ...createdCustomer,
          invite,
        },
        201
      );
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }

      console.error('Customer POST error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    } finally {
      client.release();
    }
  }
);

router.put(
  '/:id',
  csrfMiddleware,
  zValidator('json', customerUpdateSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const id = c.req.param('id');
      const payload = c.req.valid('json');
      const cleanName = payload.name.trim();
      const cleanEmail = normalizeEmail(payload.email);
      const rawPhone = cleanOptionalString(payload.phone);
      const cleanPhone = rawPhone ? rawPhone.trim() : null;
      const cleanCpf = payload.cpf ? normalizeCpfDigits(payload.cpf) : null;
      const cleanAddress = cleanOptionalString(payload.address);
      const cleanNotes = cleanOptionalString(payload.notes);
      const avatar = buildAvatar(cleanName);

      const { rows } = await db.query(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone = $3,
             cpf = $4,
             address = $5,
             notes = $6,
             avatar = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING id, name, email, phone, cpf, address, notes, avatar, role, created_at`,
        [cleanName, cleanEmail, cleanPhone, cleanCpf, cleanAddress, cleanNotes, avatar, id]
      );

      if (!rows.length) {
        return jsonError(c, 404, 'Usuário não encontrado');
      }

      setNoStore(c);
      return c.json(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }

      console.error('Customers PUT error:', error);
      return jsonError(c, 500, 'Erro interno no servidor');
    }
  }
);

router.post('/:id/invite', csrfMiddleware, async (c) => {
  const db = c.get('db');
  const client = await db.connect();

  try {
    const id = c.req.param('id');
    const { rows } = await client.query(
      `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    const invite = await generatePasswordSetupInvite(c, client, rows[0]);
    setNoStore(c);
    return c.json({ ...rows[0], invite });
  } catch (error) {
    console.error('Customers invite error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  } finally {
    client.release();
  }
});

router.patch('/:id/reset-password', csrfMiddleware, async (c) => {
  const db = c.get('db');
  const client = await db.connect();

  try {
    const id = c.req.param('id');
    const { rows } = await client.query(
      `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    const invite = await generatePasswordSetupInvite(c, client, rows[0]);
    setNoStore(c);
    return c.json({ ...rows[0], invite });
  } catch (error) {
    console.error('Customers reset-password error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  } finally {
    client.release();
  }
});

router.patch('/:id/role', csrfMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const { role } = await c.req.json();

    if (!['admin', 'customer'].includes(role)) {
      return jsonError(c, 400, 'Cargo inválido');
    }

    const { rows } = await db.query(
      `UPDATE users
       SET role = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, role`,
      [role, id]
    );

    if (!rows.length) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    return c.json(rows[0]);
  } catch (error) {
    console.error('Customers PATCH /role error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.delete('/:id', csrfMiddleware, async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    const { rowCount } = await db.query(
      `DELETE FROM users
       WHERE id = $1`,
      [id]
    );

    if (!rowCount) {
      return jsonError(c, 404, 'Usuário não encontrado');
    }

    setNoStore(c);
    return c.json({ message: 'Usuário excluído' });
  } catch (error) {
    console.error('Customers DELETE error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

export default router;
