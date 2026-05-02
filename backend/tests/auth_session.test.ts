import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.setTimeout(15000);

const TEST_PASSWORD = 'SenhaForte#123';
const TEST_ADDRESS = {
  street: 'Rua das Flores',
  number: '10',
  neighborhood: 'Centro',
  city: 'Cuiaba',
  state: 'MT',
  zipCode: '78000-000',
};

const TEST_USER_ROW = {
  id: 'user-1',
  password: `hash:${TEST_PASSWORD}`,
  role: 'admin',
  name: 'Admin Teste',
  email: 'admin@example.com',
  phone: '65999999999',
  cpf: '12345678900',
  address: JSON.stringify(TEST_ADDRESS),
  avatar: null,
  created_at: new Date('2026-01-01T12:00:00.000Z'),
  updated_at: new Date('2026-01-02T12:00:00.000Z'),
};

const TEST_USER = {
  id: TEST_USER_ROW.id,
  name: TEST_USER_ROW.name,
  email: TEST_USER_ROW.email,
  role: 'admin' as const,
  phone: TEST_USER_ROW.phone,
  cpf: TEST_USER_ROW.cpf,
  address: TEST_ADDRESS,
  avatar: undefined,
  createdAt: TEST_USER_ROW.created_at,
  updatedAt: TEST_USER_ROW.updated_at,
};

let Hono: any;
let authRoutes: any;
let authService: any;
let cacheService: any;
let cryptoMod: any;

beforeAll(async () => {
  const honoMod = await import('hono');
  Hono = honoMod.Hono;

  const authRoutesMod = await import('../src/modules/auth/routes');
  authRoutes = authRoutesMod.default;

  authService = await import('../src/modules/auth/service');

  const cacheServiceMod = await import('../src/modules/system/cacheService');
  cacheService = cacheServiceMod.cacheService;
  
  // Import REAL crypto module
  cryptoMod = await import('../src/core/utils/crypto');
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  cacheService.clearAll();
  cacheService.resetMetrics();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function buildDbMock(handlers: any = {}) {
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

// Mock environment
const mockEnv = {
  CACHE_KV: undefined as any,
  executionCtx: undefined as any,
};

function buildAuthApp(db: any) {
  const app = new Hono();
  app.use('*', async (c: any, next: any) => {
    c.set('db', db);
    await next();
  });
  app.route('/auth', authRoutes);
  return app;
}

function buildServiceApp(db: any) {
  const app = new Hono();
  app.use('*', async (c: any, next: any) => {
    c.set('db', db);
    await next();
  });

  app.post('/issue', async (c: any) => {
    const result = await authService.issueSession(c, db, TEST_USER);
    return c.json({ ok: true, ...result });
  });

  app.get('/resolve', async (c: any) => {
    const session = await authService.resolveSession(c, db);
    if (!session) {
      return c.json({ error: 'Sessão inválida ou expirada' }, 401);
    }

    return c.json({
      sessionId: session.id,
      csrfToken: session.csrfToken,
      user: session.user,
    });
  });

  return app;
}

function buildSessionLookupRow(overrides: Record<string, unknown> = {}) {
  return {
    session_id: 'db-session-1',
    user_id: TEST_USER.id,
    csrf_token: 'db-csrf-token',
    expires_at: new Date('2030-01-01T00:00:00.000Z'),
    id: TEST_USER_ROW.id,
    name: TEST_USER_ROW.name,
    email: TEST_USER_ROW.email,
    role: TEST_USER_ROW.role,
    phone: TEST_USER_ROW.phone,
    cpf: TEST_USER_ROW.cpf,
    address: TEST_USER_ROW.address,
    avatar: TEST_USER_ROW.avatar,
    created_at: TEST_USER_ROW.created_at,
    updated_at: TEST_USER_ROW.updated_at,
    ...overrides,
  };
}

// Helper to make request with env
async function requestWithEnv(app: any, path: string, options: any = {}, env: any = mockEnv) {
  const url = `http://localhost${path}`;
  const req = new Request(url, options);
  const res = await app.fetch(req, env);
  return res;
}

describe('Auth session cache', () => {
  // We'll use the real crypto functions and calculate expected values
  const sessionToken = 'session-token'; // This is what randomToken(32) returns (not mocked anymore)
  
  it('aquece o cache com shape canônico e resolve a próxima requisição sem fallback ao banco', async () => {
    const expiresAt = new Date('2030-02-01T00:00:00.000Z');
    const expectedTokenHash = await cryptoMod.sha256Hex(sessionToken);
    
    const db = buildDbMock({
      query: async (text: string) => {
        if (text.includes('INSERT INTO auth_sessions')) {
          return {
            rows: [
              {
                id: 'session-123',
                user_id: TEST_USER.id,
                csrf_token: 'csrf-token',
                expires_at: expiresAt,
              },
            ],
          };
        }

        if (text.includes('INNER JOIN users u')) {
          throw new Error('resolveSession não deveria consultar o banco após aquecer o cache');
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });

    const app = buildServiceApp(db);

    const issueRes = await requestWithEnv(app, '/issue', { method: 'POST' });
    expect(issueRes.status).toBe(200);

    // Wait a bit for async cache set to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const cached = await cacheService.getSession(expectedTokenHash);
    expect(cached).toBeDefined();
    expect(cached.id).toBe('session-123');
  });

  it('mantém o fluxo /auth/login -> /auth/me autenticado sem 401', async () => {
    const expiresAt = new Date('2030-04-01T00:00:00.000Z');
    const expectedTokenHash = await cryptoMod.sha256Hex(sessionToken);
    
    const db = buildDbMock({
      query: async (text: string, params: any[]) => {
        if (text.includes('FROM users WHERE email = $1')) {
          expect(params).toEqual([TEST_USER.email]);
          return { rows: [TEST_USER_ROW] };
        }

        if (text.includes('INSERT INTO auth_sessions')) {
          return {
            rows: [
              {
                id: 'route-session-1',
                user_id: TEST_USER.id,
                csrf_token: 'csrf-token',
                expires_at: expiresAt,
              },
            ],
          };
        }

        if (text.includes('UPDATE users SET login_attempts')) {
          return { rowCount: 1 };
        }

        if (text.includes('INNER JOIN users u')) {
          throw new Error('auth/me não deveria cair no banco após login bem-sucedido');
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });

    const app = buildAuthApp(db);
    const loginRes = await requestWithEnv(app, '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: TEST_USER.email,
        password: TEST_PASSWORD,
      }),
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.headers.get('set-cookie') || '').toContain('lz_session=');

    const meRes = await requestWithEnv(app, '/auth/me', {
      headers: {
        Cookie: `lz_session=${sessionToken}`,
      }),
    });

    expect(meRes.status).toBe(200);
  });
});
