import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { adminOnly, authMiddleware } from '../middleware/auth.js';
import { customerCreateSchema, customerUpdateSchema } from '../domain/schemas.js';
import { generatePasswordSetupInvite } from '../services/authService.js';
import {
  buildAvatar,
  cleanOptionalString,
  isUniqueViolation,
  isValidCpf,
  isValidUuid,
  normalizeCpfDigits,
  normalizeEmail,
  normalizePhoneDigits,
  uniqueFieldLabel,
} from '../utils/normalize.js';
import { jsonError, setNoStore, validationError } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../domain/constants.js';

const router = new Hono();

const CUSTOMER_SAFE_COLUMNS = 'id, name, email, phone, cpf, address, notes, avatar, role, created_at';

// ARCH-05: Validação consistente para IDs (suporta UUID e integer)
function isValidId(id) {
  if (typeof id !== 'string') return false;
  return isValidUuid(id) || /^\d+$/.test(id);
}

// SEC-05: Schema Zod para role update
const roleSchema = z.object({
  role: z.enum(['admin', 'customer']),
  password: z
    .string()
    .min(1, 'Senha administrativa é obrigatória')
    .max(128, 'Senha administrativa excede o limite permitido'),
});

const deleteSchema = z.object({
  password: z
    .string()
    .min(1, 'Senha administrativa é obrigatória')
    .max(128, 'Senha administrativa excede o limite permitido'),
});

async function validatePrivilegedAction(c, db, password, action, targetId) {
  const currentUser = c.get('user');
  const { rows } = await db.query('SELECT password FROM users WHERE id = $1', [currentUser.id]);

  if (!rows.length) {
    return { ok: false, response: jsonError(c, 404, 'Administrador autenticado não encontrado') };
  }

  const passwordHash = rows[0].password || '';
  const validPassword = passwordHash ? await bcrypt.compare(password, passwordHash) : false;

  if (!validPassword) {
    logger.warn('Falha na confirmação de ação privilegiada', {
      action,
      actorUserId: currentUser.id,
      targetId,
    });
    return { ok: false, response: jsonError(c, 403, 'Senha administrativa incorreta') };
  }

  return { ok: true };
}

// ARCH-01: Função compartilhada para invite e reset-password
async function handleInvite(c) {
  const db = c.get('db');
  const client = await db.connect();
  try {
    const id = c.req.param('id');
    if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

    // SEC-10: Colunas explícitas — nunca retornar password hash
    const { rows } = await client.query(
      `SELECT ${CUSTOMER_SAFE_COLUMNS} FROM users WHERE id = $1`,
      [id]
    );
    if (!rows.length) return jsonError(c, 404, 'Usuário não encontrado');

    const invite = await generatePasswordSetupInvite(c, client, rows[0]);
    return c.json({ ...rows[0], invite });
  } catch (error) {
    logger.error('Erro ao gerar convite', error, { id: c.req.param('id') });
    return jsonError(c, 500, 'Erro ao gerar link de convite.');
  } finally {
    client.release();
  }
}

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  const db = c.get('db');
  const limit = Math.min(parseInt(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);

  // A paginação é aplicada sem precisar calcular o count total, pois o frontend não exige

  const { rows } = await db.query(
    `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
     FROM (
       SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at FROM users
       UNION ALL
       SELECT 
         MIN(id) as id, customer_name as name, NULL as email, customer_phone as phone, 
         NULL as cpf, address, 'Cliente convidado' as notes, NULL as avatar, 'guest' as role, 
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
});

router.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  if (!isValidId(id)) {
    return jsonError(c, 400, 'ID inválido');
  }

  const { rows: userRows } = await db.query(
    `SELECT ${CUSTOMER_SAFE_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );

  let customer;
  if (userRows.length) {
    customer = userRows[0];
  } else {
    const { rows: guestRows } = await db.query(
      `SELECT MIN(id) as id, customer_name as name, null as email, customer_phone as phone, 
         null as cpf, address, 'Cliente convidado' as notes, null as avatar, 'guest' as role, 
         MIN(created_at) as created_at
       FROM orders
       WHERE customer_id IS NULL AND id::text = $1
       GROUP BY customer_name, customer_phone, address`,
      [id]
    );
    if (!guestRows.length) return jsonError(c, 404, 'Cliente não encontrado');
    customer = guestRows[0];
  }

  const normalizedPhone = normalizePhoneDigits(customer.phone || '');
  const { rows: stats } = await db.query(
    `SELECT COALESCE(SUM(total), 0) as total_spent, COUNT(*) as order_count
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
});

router.get('/:id/orders', async (c) => {
  try {
    const db = c.get('db');
    const id = c.req.param('id');
    if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

    let phone = '';
    const { rows: userRows } = await db.query('SELECT phone FROM users WHERE id = $1', [id]);
    if (userRows.length) {
      phone = userRows[0].phone || '';
    } else {
      const { rows: orderRows } = await db.query(
        'SELECT customer_phone FROM orders WHERE id::text = $1',
        [id]
      );
      if (orderRows.length) {
        phone = orderRows[0].customer_phone || '';
      } else {
        return jsonError(c, 404, 'Cliente não encontrado');
      }
    }

    const { rows } = await db.query(
      `SELECT id, customer_name, customer_phone, items, total, status, delivery_type, payment_method, created_at
       FROM orders
       WHERE customer_id = $1 OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2)
       ORDER BY created_at DESC`,
      [id, normalizePhoneDigits(phone)]
    );

    setNoStore(c);
    return c.json(rows);
  } catch (error) {
    logger.error('Erro ao buscar pedidos do cliente (GET /:id/orders)', error, {
      id: c.req.param('id'),
    });
    return jsonError(c, 500, 'Erro ao carregar o histórico de pedidos do cliente.');
  }
});

router.post(
  '/',
  zValidator('json', customerCreateSchema, validationError),
  async (c) => {
    const db = c.get('db');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const payload = c.req.valid('json');

      if (payload.cpf && !isValidCpf(payload.cpf)) {
        await client.query('ROLLBACK');
        return jsonError(c, 400, 'CPF inválido');
      }

      const cleanName = payload.name.trim();
      const cleanEmail = normalizeEmail(payload.email);
      const cleanPhone = cleanOptionalString(payload.phone)?.trim() || null;
      const cleanCpf = payload.cpf ? normalizeCpfDigits(payload.cpf) : null;
      const cleanAddress = cleanOptionalString(payload.address);
      const cleanNotes = cleanOptionalString(payload.notes);
      const avatar = buildAvatar(cleanName);

      const { rows } = await client.query(
        `INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, notes, avatar)
         VALUES ($1, $2, NULL, false, 'customer', $3, $4, $5, $6, $7)
         RETURNING ${CUSTOMER_SAFE_COLUMNS}`,
        [cleanName, cleanEmail, cleanPhone, cleanCpf, cleanAddress, cleanNotes, avatar]
      );

      const createdCustomer = rows[0];
      const invite = await generatePasswordSetupInvite(c, client, createdCustomer);
      await client.query('COMMIT');
      return c.json({ ...createdCustomer, invite }, 201);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (isUniqueViolation(error))
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      logger.error('Erro ao criar cliente (POST)', error);
      return jsonError(c, 500, 'Erro ao cadastrar o novo cliente.');
    } finally {
      client.release();
    }
  }
);

router.put(
  '/:id',
  zValidator('json', customerUpdateSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

      const payload = c.req.valid('json');
      if (payload.cpf && !isValidCpf(payload.cpf)) return jsonError(c, 400, 'CPF inválido');

      const cleanName = payload.name?.trim();
      const cleanEmail = payload.email !== undefined ? normalizeEmail(payload.email) : undefined;
      const cleanPhone =
        payload.phone !== undefined ? cleanOptionalString(payload.phone)?.trim() || null : undefined;
      const cleanCpf = payload.cpf ? normalizeCpfDigits(payload.cpf) : undefined;
      const cleanAddress =
        payload.address !== undefined ? cleanOptionalString(payload.address) : undefined;
      const cleanNotes =
        payload.notes !== undefined ? cleanOptionalString(payload.notes) : undefined;
      const avatar = cleanName ? buildAvatar(cleanName) : undefined;

      const { rows } = await db.query(
        `UPDATE users SET 
           name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           phone = COALESCE($3, phone), 
           cpf = COALESCE($4, cpf), 
           address = COALESCE($5, address), 
           notes = COALESCE($6, notes), 
           avatar = COALESCE($7, avatar), 
           updated_at = NOW()
         WHERE id = $8 
         RETURNING ${CUSTOMER_SAFE_COLUMNS}`,
        [cleanName, cleanEmail, cleanPhone, cleanCpf, cleanAddress, cleanNotes, avatar, id]
      );

      if (!rows.length) return jsonError(c, 404, 'Usuário não encontrado');
      return c.json(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error))
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      logger.error('Erro ao atualizar cliente (PUT)', error, { id: c.req.param('id') });
      return jsonError(c, 500, 'Erro ao salvar as atualizações do cliente.');
    }
  }
);

// ARCH-01: Reutiliza handleInvite para ambos endpoints
router.post('/:id/invite', handleInvite);
router.patch('/:id/reset-password', handleInvite);

// SEC-05: Role update com validação Zod
router.patch(
  '/:id/role',
  zValidator('json', roleSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const currentUser = c.get('user');
      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

      if (String(currentUser.id) === String(id)) {
        return jsonError(c, 400, 'Não é permitido alterar o próprio cargo por este endpoint');
      }

      const { role, password } = c.req.valid('json');
      const passwordCheck = await validatePrivilegedAction(
        c,
        db,
        password,
        'customers.updateRole',
        id
      );
      if (!passwordCheck.ok) return passwordCheck.response;

      const { rows } = await db.query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, role`,
        [role, id]
      );
      if (!rows.length) return jsonError(c, 404, 'Usuário não encontrado');
      return c.json(rows[0]);
    } catch (error) {
      logger.error('Erro ao atualizar cargo do cliente (PATCH role)', error, {
        id: c.req.param('id'),
      });
      return jsonError(c, 500, 'Erro ao alterar a permissão do usuário.');
    }
  }
);

router.delete(
  '/:id',
  zValidator('json', deleteSchema, validationError),
  async (c) => {
    try {
      const db = c.get('db');
      const currentUser = c.get('user');
      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

      if (String(currentUser.id) === String(id)) {
        return jsonError(c, 400, 'A autoexclusão não é permitida por este endpoint');
      }

      const { password } = c.req.valid('json');
      const passwordCheck = await validatePrivilegedAction(
        c,
        db,
        password,
        'customers.delete',
        id
      );
      if (!passwordCheck.ok) return passwordCheck.response;

      const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
      if (!rowCount) return jsonError(c, 404, 'Usuário não encontrado');
      return c.json({ message: 'Usuário excluído' });
    } catch (error) {
      logger.error('Erro ao excluir cliente (DELETE)', error, { id: c.req.param('id') });
      return jsonError(c, 500, 'Erro ao remover o cliente.');
    }
  }
);

export default router;
