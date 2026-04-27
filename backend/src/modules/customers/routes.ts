import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyPassword } from '../../core/utils/crypto';
import { adminOnly, authMiddleware } from '../../core/middleware/auth';
import { customerCreateSchema, customerUpdateSchema } from '../../core/domain/schemas';
import { jsonError, setNoStore, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../core/domain/constants';
import { Bindings, Variables } from '../../core/types';
import { CustomerService } from './service';
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
} from '../../core/utils/normalize';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function isValidId(id: string): boolean {
  return isValidUuid(id) || /^\d+$/.test(id);
}

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

async function validatePrivilegedAction(c: any, service: CustomerService, password: string, action: string, targetId: string) {
  const currentUser = c.get('user');
  if (!currentUser) {
    return { ok: false, response: jsonError(c, 401, 'Usuário não autenticado') };
  }

  const passwordHash = await service.getPasswordForVerification(currentUser.id);
  if (!passwordHash) {
    return { ok: false, response: jsonError(c, 404, 'Administrador autenticado não encontrado') };
  }

  const validPassword = await verifyPassword(password, passwordHash);
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

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  const service = new CustomerService(c.get('db'));
  const limitQuery = c.req.query('limit');
  const offsetQuery = c.req.query('offset');
  const limit = Math.min(parseInt(limitQuery || '') || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(parseInt(offsetQuery || '') || 0, 0);

  const customers = await service.getAllCustomers(limit, offset);
  setNoStore(c as any);
  return c.json(customers);
});

router.get('/:id', async (c) => {
  const service = new CustomerService(c.get('db'));
  const id = c.req.param('id');

  if (!isValidId(id)) {
    return jsonError(c, 400, 'ID inválido');
  }

  const customer = await service.getCustomerById(id);
  if (!customer) {
    return jsonError(c, 404, 'Cliente não encontrado');
  }

  setNoStore(c as any);
  return c.json(customer);
});

router.get('/:id/orders', async (c) => {
  try {
    const service = new CustomerService(c.get('db'));
    const id = c.req.param('id');
    if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

    const orders = await service.getCustomerOrders(id);
    if (orders === null) {
      return jsonError(c, 404, 'Cliente não encontrado');
    }

    setNoStore(c as any);
    return c.json(orders);
  } catch (error) {
    logger.error('Erro ao buscar pedidos do cliente (GET /:id/orders)', error as Error, {
      id: c.req.param('id'),
    });
    return jsonError(c, 500, 'Erro ao carregar o histórico de pedidos do cliente.');
  }
});

router.post(
  '/',
  zValidator('json', customerCreateSchema, validationError),
  async (c) => {
    const service = new CustomerService(c.get('db'));
    try {
      const payload = c.req.valid('json') as any;
      const createdCustomer = await service.createCustomer(c, payload);
      return c.json(createdCustomer, 201);
    } catch (error: any) {
      if (error.message === 'CPF_INVALID') {
        return jsonError(c, 400, 'CPF inválido');
      }
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }
      logger.error('Erro ao criar cliente (POST)', error as Error);
      return jsonError(c, 500, 'Erro ao cadastrar o novo cliente.');
    }
  }
);

router.put(
  '/:id',
  zValidator('json', customerUpdateSchema, validationError),
  async (c) => {
    try {
      const service = new CustomerService(c.get('db'));
      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

      const payload = c.req.valid('json') as any;
      const updatedCustomer = await service.updateCustomer(id, payload);

      if (!updatedCustomer) return jsonError(c, 404, 'Usuário não encontrado');
      return c.json(updatedCustomer);
    } catch (error: any) {
      if (error.message === 'CPF_INVALID') {
        return jsonError(c, 400, 'CPF inválido');
      }
      if (isUniqueViolation(error)) {
        return jsonError(c, 409, `${uniqueFieldLabel(error)} já cadastrado`);
      }
      logger.error('Erro ao atualizar cliente (PUT)', error as Error, { id: c.req.param('id') });
      return jsonError(c, 500, 'Erro ao salvar as atualizações do cliente.');
    }
  }
);

router.post('/:id/invite', async (c) => {
  const service = new CustomerService(c.get('db'));
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  const customer = await service.inviteCustomer(c, id);
  if (!customer) return jsonError(c, 404, 'Usuário não encontrado');
  return c.json(customer);
});

router.patch('/:id/reset-password', async (c) => {
  const service = new CustomerService(c.get('db'));
  const id = c.req.param('id');
  if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

  const customer = await service.inviteCustomer(c, id);
  if (!customer) return jsonError(c, 404, 'Usuário não encontrado');
  return c.json(customer);
});

router.patch(
  '/:id/role',
  zValidator('json', roleSchema, validationError),
  async (c) => {
    try {
      const service = new CustomerService(c.get('db'));
      const currentUser = c.get('user');
      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

      if (!currentUser) return jsonError(c, 401, 'Usuário não autenticado');

      if (String(currentUser.id) === String(id)) {
        return jsonError(c, 400, 'Não é permitido alterar o próprio cargo por este endpoint');
      }

      const { role, password } = c.req.valid('json');
      const passwordCheck = await validatePrivilegedAction(
        c,
        service,
        password,
        'customers.updateRole',
        id
      );
      if (!passwordCheck.ok) return passwordCheck.response;

      const updatedCustomer = await service.updateRole(id, role);
      if (!updatedCustomer) return jsonError(c, 404, 'Usuário não encontrado');
      return c.json(updatedCustomer);
    } catch (error) {
      logger.error('Erro ao atualizar cargo do cliente (PATCH role)', error as Error, {
        id: c.req.param('id'),
      });
      return jsonError(c, 500, 'Erro ao alterar a permissão do usuário.');
    }
  }
);

router.delete(
  '/:id',
  async (c) => {
    try {
      const service = new CustomerService(c.get('db'));
      const currentUser = c.get('user');
      const id = c.req.param('id');
      if (!isValidId(id)) return jsonError(c, 400, 'ID inválido');

      if (!currentUser) return jsonError(c, 401, 'Usuário não autenticado');

      if (String(currentUser.id) === String(id)) {
        return jsonError(c, 400, 'A autoexclusão não é permitida por este endpoint');
      }

      const password = c.req.header('x-admin-password') || '';
      if (!password) {
        return jsonError(c, 400, 'Senha administrativa é obrigatória');
      }
      const passwordCheck = await validatePrivilegedAction(
        c,
        service,
        password,
        'customers.delete',
        id
      );
      if (!passwordCheck.ok) return passwordCheck.response;

      const deleted = await service.deleteCustomer(id);
      if (!deleted) return jsonError(c, 404, 'Usuário não encontrado');
      return c.json({ message: 'Usuário excluído' });
    } catch (error) {
      logger.error('Erro ao excluir cliente (DELETE)', error as Error, { id: c.req.param('id') });
      return jsonError(c, 500, 'Erro ao remover o cliente.');
    }
  }
);

export default router;
