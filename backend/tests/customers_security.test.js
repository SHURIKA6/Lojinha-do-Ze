import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono } from 'hono';

const bcryptCompareMock = jest.fn(async (value, hash) => hash === `hash:${value}`);

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authMiddleware: async (c, next) => {
    c.set('user', {
      id: c.req.header('x-test-user-id') || '1',
      role: c.req.header('x-test-user-role') || 'admin',
    });
    c.set('session', { id: 'session-1' });
    await next();
  },
  adminOnly: async (c, next) => {
    if (c.get('user')?.role !== 'admin') {
      return c.json({ error: 'Acesso restrito ao administrador' }, 403);
    }
    await next();
  },
  csrfMiddleware: async (_c, next) => {
    await next();
  },
}));

const { default: customersRoutes } = await import('../src/routes/customers.js');
const { default: profileRoutes } = await import('../src/routes/profile.js');

function buildDbMock(handlers = {}) {
  const query = jest.fn(async (text, params) => {
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

function buildApp(route, db) {
  const app = new Hono();
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
    await expect(res.json()).resolves.toEqual({
      error: 'Informe ao menos um campo para atualização',
    });
  });

  it('exige confirmação de senha para alterar cargo', async () => {
    const db = buildDbMock({
      query: async (text, params) => {
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

  it('impede autoexclusão e exclusão sem senha válida', async () => {
    const db = buildDbMock({
      query: async (text, params) => {
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
