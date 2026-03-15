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
    const limit = Math.min(parseInt(c.req.query('limit')) || 100, 200);
    const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);

    const countRes = await db.query(`
      SELECT COUNT(*) FROM (
        SELECT id FROM users
        UNION
        SELECT MIN(id) FROM orders WHERE customer_id IS NULL GROUP BY customer_phone
      ) as total_customers
    `);
    const total = parseInt(countRes.rows[0].count);

    const { rows } = await db.query(
      `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
       FROM (
         SELECT 
           id, name, email, phone, cpf, address, notes, avatar, role, created_at
         FROM users
         UNION ALL
         SELECT 
           MIN(id) as id, 
           customer_name as name, 
           NULL as email, 
           customer_phone as phone, 
           NULL as cpf, 
           address, 
           'Cliente convidado' as notes, 
           NULL as avatar, 
           'guest' as role, 
           MIN(created_at) as created_at
         FROM orders
         WHERE customer_id IS NULL
         GROUP BY customer_name, customer_phone, address
       ) as combined_customers
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

    // Fetch user first
    const { rows: userRows } = await db.query(
      `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    let customer;

    if (userRows.length) {
      customer = userRows[0];
    } else {
      // If not in users, check if it's a guest from orders
      const { rows: guestRows } = await db.query(
        `SELECT 
           MIN(id) as id, 
           customer_name as name, 
           null as email, 
           customer_phone as phone, 
           null as cpf, 
           address, 
           'Cliente convidado' as notes, 
           null as avatar, 
           'guest' as role, 
           MIN(created_at) as created_at
         FROM orders
         WHERE customer_id IS NULL AND id::text = $1
         GROUP BY customer_name, customer_phone, address`,
        [id]
      );

      if (!guestRows.length) {
        return jsonError(c, 404, 'Cliente não encontrado');
      }
      customer = guestRows[0];
    }

    // Calculate metrics
    const normalizedPhone = normalizePhoneDigits(customer.phone || '');
    const { rows: stats } = await db.query(
      `SELECT 
         COALESCE(SUM(total), 0) as total_spent,
         COUNT(*) as order_count
       FROM orders
       WHERE (customer_id = $1 OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2))
         AND status = 'concluido'`,
      [customer.id, normalizedPhone]
    );

    setNoStore(c);
    return c.json({
      ...customer,
      total_spent: parseFloat(stats[0].total_spent),
      order_count: parseInt(stats[0].order_count, 10),
    });
  } catch (error) {
    console.error('Customers GET /:id error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

router.get('/:id/orders', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');

    // First, find the customer to get their phone
    let phone = '';
    
    const { rows: userRows } = await db.query('SELECT phone FROM users WHERE id = $1', [id]);
    if (userRows.length) {
      phone = userRows[0].phone || '';
    } else {
      const { rows: orderRows } = await db.query('SELECT customer_phone FROM orders WHERE id::text = $1', [id]);
      if (orderRows.length) {
        phone = orderRows[0].customer_phone || '';
      } else {
        return jsonError(c, 404, 'Cliente não encontrado');
      }
    }

    const normalizedPhone = normalizePhoneDigits(phone);

    const { rows } = await db.query(
      `SELECT id, customer_name, customer_phone, items, total, status, delivery_type, payment_method, created_at
       FROM orders
       WHERE customer_id = $1
          OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2)
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
