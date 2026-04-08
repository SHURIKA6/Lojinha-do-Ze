import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono, Context, Next } from 'hono';

const bcryptCompareMock = jest.fn(async (value: string, hash: string) => hash === `hash:${value}`);

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

jest.unstable_mockModule('../src/middleware/auth', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-test-user-id') || '1',
      role: c.req.header('x-test-user-role') || 'admin',
    });
    c.set('session', { id: 'session-1' });
    await next();
  },
  adminOnly: async (c: Context, next: Next) => {
    const role = (c.get('user') as any)?.role;
    if (role !== 'admin' && role !== 'shura') {
      return c.json({ error: 'Acesso restrito a administradores' }, 403);
    }
    await next();
  },
  csrfMiddleware: async (_c: Context, next: Next) => {
    await next();
  },
}));

const { default: customersRoutes } = await import('../src/routes/customers');
const { default: profileRoutes } = await import('../src/routes/profile');

interface DbHandlers {
  query?: (text: string, params?: any[]) => Promise<any>;
}

function buildDbMock(handlers: DbHandlers = {}) {
  const query = jest.fn(async (text: string, params: any[] = []) => {
    if (handlers.query) {
      return handlers.query(text, params);
    }

    throw new Error(`Query não tratada no teste: ${text}`);
  });

  return {
    query,
    connect: async () => ({
      query,
      release() {},
    }),
    close: async () => {},
  };
}

type Bindings = {
  user?: { id: string; role: string };
  session?: { id: string };
};

type Variables = {
  db: ReturnType<typeof buildDbMock>;
  user: { id: string; role: string };
  session: { id: string };
};

function buildApp(route: Hono<any, any, any>, db: ReturnType<typeof buildDbMock>) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });
  app.route('/', route);
  return app;
}

describe('Customers and Profile Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloqueia tentativa de enviar campo de privilégio no perfil', async () => {
    const app = buildApp(profileRoutes, buildDbMock());

    const res = await app.request(
      '/?ignored=1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: 'SHURA_ADMIN' }),
      }
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Informe ao menos um campo para atualização',
      })
    );
  });

  it('exige confirmação de senha para alterar cargo', async () => {
    const db = buildDbMock({
      query: async (text: string, params: any[] = []) => {
        if (text.includes('SELECT id, name, role FROM users WHERE id = $1')) {
          return { rows: [{ id: params[0], name: 'Ana', role: 'customer' }] };
        }

        if (text.includes('SELECT password FROM users WHERE id = $1')) {
          return { rows: [{ password: 'hash:SenhaForte#123' }] };
        }

        if (text.includes('UPDATE users SET role = $1')) {
          return { rows: [{ id: params[1], name: 'Ana', role: params[0] }] };
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });
    const app = buildApp(customersRoutes, db);

    const forbidden = await app.request('/2/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'customer', password: 'senha-errada' }),
    });

    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ error: 'Senha administrativa incorreta' });

    const success = await app.request('/2/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'customer', password: 'SenhaForte#123' }),
    });

    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({
      id: '2',
      name: 'Ana',
      role: 'customer',
    });
    expect(db.query).toHaveBeenCalledWith('SELECT password FROM users WHERE id = $1', ['1']);
  });

  it('impede que admin promova para shura ou altere um shura existente', async () => {
    const db = buildDbMock({
      query: async (text: string, params: any[] = []) => {
        if (text.includes('SELECT id, name, role FROM users WHERE id = $1')) {
          if (params[0] === '2') {
            return { rows: [{ id: '2', name: 'Bia', role: 'customer' }] };
          }

          if (params[0] === '3') {
            return { rows: [{ id: '3', name: 'Kai', role: 'shura' }] };
          }
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });
    const app = buildApp(customersRoutes, db);

    const promoteToShura = await app.request('/2/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-test-user-role': 'admin' },
      body: JSON.stringify({ role: 'shura', password: 'SenhaForte#123' }),
    });

    expect(promoteToShura.status).toBe(403);
    await expect(promoteToShura.json()).resolves.toEqual({
      error: 'Apenas um SHURA pode promover outros usuários a este cargo',
    });

    const editExistingShura = await app.request('/3/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-test-user-role': 'admin' },
      body: JSON.stringify({ role: 'customer', password: 'SenhaForte#123' }),
    });

    expect(editExistingShura.status).toBe(403);
    await expect(editExistingShura.json()).resolves.toEqual({
      error: 'Apenas um SHURA pode alterar o cargo de outro SHURA',
    });
  });

  it('permite que shura promova e rebaixe cargos privilegiados de terceiros', async () => {
    const db = buildDbMock({
      query: async (text: string, params: any[] = []) => {
        if (text.includes('SELECT id, name, role FROM users WHERE id = $1')) {
          if (params[0] === '5') {
            return { rows: [{ id: '5', name: 'Lia', role: 'admin' }] };
          }

          if (params[0] === '6') {
            return { rows: [{ id: '6', name: 'Ryu', role: 'shura' }] };
          }
        }

        if (text.includes('SELECT password FROM users WHERE id = $1')) {
          return { rows: [{ password: 'hash:SenhaForte#123' }] };
        }

        if (text.includes('UPDATE users SET role = $1')) {
          return { rows: [{ id: params[1], name: params[1] === '5' ? 'Lia' : 'Ryu', role: params[0] }] };
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });
    const app = buildApp(customersRoutes, db);

    const promote = await app.request('/5/role', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-role': 'shura',
        'x-test-user-id': '99',
      },
      body: JSON.stringify({ role: 'shura', password: 'SenhaForte#123' }),
    });

    expect(promote.status).toBe(200);
    await expect(promote.json()).resolves.toEqual({
      id: '5',
      name: 'Lia',
      role: 'shura',
    });

    const demote = await app.request('/6/role', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-role': 'shura',
        'x-test-user-id': '99',
      },
      body: JSON.stringify({ role: 'admin', password: 'SenhaForte#123' }),
    });

    expect(demote.status).toBe(200);
    await expect(demote.json()).resolves.toEqual({
      id: '6',
      name: 'Ryu',
      role: 'admin',
    });
  });

  it('retorna convidados com customer_type guest e role nulo na listagem', async () => {
    const db = buildDbMock({
      query: async (text: string, _params: any[] = []) => {
        if (text.includes('combined_customers')) {
          return {
            rows: [
              {
                id: '1',
                name: 'Alice',
                email: 'alice@example.com',
                phone: '65999999999',
                cpf: null,
                address: 'Rua A',
                notes: null,
                avatar: 'A',
                role: 'customer',
                customer_type: 'registered',
                created_at: '2026-04-01T00:00:00.000Z',
                updated_at: '2026-04-02T00:00:00.000Z',
              },
              {
                id: '77',
                name: 'Convidado',
                email: null,
                phone: '65988888888',
                cpf: null,
                address: 'Rua B',
                notes: 'Cliente convidado',
                avatar: null,
                role: null,
                customer_type: 'guest',
                created_at: '2026-04-03T00:00:00.000Z',
                updated_at: null,
              },
            ],
          };
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });
    const app = buildApp(customersRoutes, db);

    const res = await app.request('/', {
      method: 'GET',
      headers: { 'x-test-user-role': 'admin' },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      {
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '65999999999',
        cpf: null,
        address: 'Rua A',
        notes: null,
        avatar: 'A',
        role: 'customer',
        customer_type: 'registered',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
      },
      {
        id: '77',
        name: 'Convidado',
        email: null,
        phone: '65988888888',
        cpf: null,
        address: 'Rua B',
        notes: 'Cliente convidado',
        avatar: null,
        role: null,
        customer_type: 'guest',
        created_at: '2026-04-03T00:00:00.000Z',
        updated_at: null,
      },
    ]);
  });

  it('impede autoexclusão e exclusão sem senha válida', async () => {
    const db = buildDbMock({
      query: async (text: string, _params: any[] = []) => {
        if (text.includes('SELECT password FROM users WHERE id = $1')) {
          return { rows: [{ password: 'hash:SenhaForte#123' }] };
        }

        if (text.includes('DELETE FROM users WHERE id = $1')) {
          return { rowCount: 1 };
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });
    const app = buildApp(customersRoutes, db);

    const selfDelete = await app.request('/1', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': '1',
      },
      body: JSON.stringify({ password: 'SenhaForte#123' }),
    });

    expect(selfDelete.status).toBe(400);
    await expect(selfDelete.json()).resolves.toEqual({
      error: 'A autoexclusão não é permitida por este endpoint',
    });

    const forbidden = await app.request('/3', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'senha-errada' }),
    });

    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ error: 'Senha administrativa incorreta' });

    const success = await app.request('/3', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'SenhaForte#123' }),
    });

    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ message: 'Usuário excluído' });
  });
});
