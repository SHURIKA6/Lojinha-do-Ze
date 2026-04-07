import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono, Context, Next } from 'hono';

const bcryptCompareMock = jest.fn(async (value: string, hash: string) => hash === `hash:${value}`);
const bcryptHashMock = jest.fn(async (value: string) => `hash:${value}`);

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
}));

jest.unstable_mockModule('../src/middleware/auth', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('user', {
      id: c.req.header('x-test-user-id') || '1',
      role: c.req.header('x-test-user-role') || 'admin',
    });
    c.set('session', {
      user: {
        id: c.req.header('x-test-user-id') || '1',
        role: c.req.header('x-test-user-role') || 'admin'
      },
      id: 'session-1'
    });
    await next();
  },
  csrfMiddleware: async (_c: Context, next: Next) => {
    await next();
  },
}));

const { default: authRoutes } = await import('../src/routes/auth');

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
  session: { user: { id: string; role: string }; id: string };
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

describe('Password Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /setup-password', () => {
    it('deve definir a senha com sucesso quando o usuário não tem senha', async () => {
      const db = buildDbMock({
        query: async (text: string, params: any[] = []) => {
          if (text.includes('SELECT password FROM users WHERE id = $1')) {
            return { rows: [{ password: null }] };
          }
          if (text.includes('UPDATE users SET password = $1')) {
            return { rowCount: 1 };
          }
          throw new Error(`Query não tratada: ${text}`);
        },
      });
      const app = buildApp(authRoutes, db);

      const res = await app.request('/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'NewPassword123', confirmPassword: 'NewPassword123' }),
      });

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ message: 'Senha definida com sucesso' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET password'), expect.arrayContaining(['hash:NewPassword123']));
    });

    it('deve falhar se as senhas não coincidirem', async () => {
      const db = buildDbMock();
      const app = buildApp(authRoutes, db);

      const res = await app.request('/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'Pass1', confirmPassword: 'Pass2' }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: 'As senhas não coincidem' });
    });

    it('deve falhar se o usuário já possuir senha', async () => {
      const db = buildDbMock({
        query: async (text: string, params: any[] = []) => {
          if (text.includes('SELECT password FROM users WHERE id = $1')) {
            return { rows: [{ password: 'hash:ExistingPassword' }] };
          }
          throw new Error(`Query não tratada: ${text}`);
        },
      });
      const app = buildApp(authRoutes, db);

      const res = await app.request('/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'NewPassword123', confirmPassword: 'NewPassword123' }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: 'A senha já foi definida. Use /change-password para alterá-la' });
    });
  });

  describe('POST /change-password', () => {
    it('deve alterar a senha com sucesso quando a senha atual for válida', async () => {
      const db = buildDbMock({
        query: async (text: string, params: any[] = []) => {
          if (text.includes('SELECT password FROM users WHERE id = $1')) {
            return { rows: [{ password: 'hash:OldPassword123' }] };
          }
          if (text.includes('UPDATE users SET password = $1')) {
            return { rowCount: 1 };
          }
          throw new Error(`Query não tratada: ${text}`);
        },
      });
      const app = buildApp(authRoutes, db);

      const res = await app.request('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: 'OldPassword123',
          newPassword: 'NewPassword456',
          confirmPassword: 'NewPassword456'
        }),
      });

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ message: 'Senha alterada com sucesso' });
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET password'), expect.arrayContaining(['hash:NewPassword456']));
    });

    it('deve falhar se a senha atual for incorreta', async () => {
      const db = buildDbMock({
        query: async (text: string, params: any[] = []) => {
          if (text.includes('SELECT password FROM users WHERE id = $1')) {
            return { rows: [{ password: 'hash:CorrectPassword' }] };
          }
          throw new Error(`Query não tratada: ${text}`);
        },
      });
      const app = buildApp(authRoutes, db);

      const res = await app.request('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        }),
      });

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Senha atual incorreta' });
    });

    it('deve falhar se as novas senhas não coincidirem', async () => {
      const db = buildDbMock();
      const app = buildApp(authRoutes, db);

      const res = await app.request('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: 'OldPassword',
          newPassword: 'New1',
          confirmPassword: 'New2'
        }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: 'As novas senhas não coincidem' });
    });

    it('deve falhar se o usuário não possuir senha configurada', async () => {
      const db = buildDbMock({
        query: async (text: string, params: any[] = []) => {
          if (text.includes('SELECT password FROM users WHERE id = $1')) {
            return { rows: [{ password: null }] };
          }
          throw new Error(`Query não tratada: ${text}`);
        },
      });
      const app = buildApp(authRoutes, db);

      const res = await app.request('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: 'any',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123'
        }),
      });

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: 'Senha não configurada ou usuário não encontrado' });
    });
  });
});
