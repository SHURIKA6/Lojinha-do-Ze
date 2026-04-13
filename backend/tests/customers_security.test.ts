import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const verifyPasswordMock = jest.fn(async (password: string, hash: string) => hash === `hash:${password}`);

jest.unstable_mockModule('../src/utils/crypto', () => ({
  randomCode: (len = 8) => 'TESTCODE' + '0'.repeat(Math.max(0, len - 8)),
  randomToken: (len = 32) => 'TESTTOKEN' + '0'.repeat(Math.max(0, len - 9)),
  sha256Hex: async (val: string) => 'hash:' + val,
  verifyPassword: verifyPasswordMock,
}));

let Hono: any;
let Bindings: any;
let Variables: any;
let customersRoutes: any;
let profileRoutes: any;

beforeAll(async () => {
  const honoMod = await import('hono');
  Hono = honoMod.Hono;

  const typesMod = await import('../src/types');
  Bindings = typesMod.Bindings;
  Variables = typesMod.Variables;

  const customers = await import('../src/modules/customers/routes');
  customersRoutes = customers.default;
  const profile = await import('../src/modules/customers/profileRoutes');
  profileRoutes = profile.default;
});

function buildDbMock(handlers: any = {}) {
  const query = jest.fn(async (text: string, params: any[]) => {
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

function buildApp(route: any, db: any) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('db', db);

    // Injetar sessão para testes para evitar 401 do authMiddleware
    const userId = c.req.header('x-test-user-id') || '1';
    const role = c.req.header('x-test-user-role') || 'admin';
    const session = {
      id: 'session-1',
      userId,
      user: { id: userId, role, name: 'Test User' },
      csrfToken: 'test-csrf',
      expiresAt: new Date(Date.now() + 3600000),
    };
    c.set('user', session.user);
    c.set('session', session);
    c.set('resolvedSession', session);

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
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-csrf',
          'Cookie': 'lz_csrf=test-csrf'
        },
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
      query: async (text: string, params: any[]) => {
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
      query: async (text: string, _params: any[]) => {
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
