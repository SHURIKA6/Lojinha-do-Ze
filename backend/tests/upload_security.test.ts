import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono } from 'hono';

let uploadRoutes: any;

beforeAll(async () => {
  const mod = await import('../src/modules/system/uploadRoutes');
  uploadRoutes = mod.default;
});

function buildApp() {
  const app = new Hono();
  app.use('*', async (c: any, next: any) => {
    c.set('db', {
      query: jest.fn(),
      connect: async () => ({ query: jest.fn(), release() {} }),
      close: async () => {},
    });

    const session = {
      id: 'session-1',
      userId: 'admin-1',
      user: { id: 'admin-1', role: 'admin', name: 'Admin' },
      csrfToken: 'csrf-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    };

    c.set('user', session.user);
    c.set('session', session);
    c.set('resolvedSession', session);

    await next();
  });
  app.route('/', uploadRoutes);
  return app;
}

describe('Upload Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bloqueia path traversal na leitura de imagens', async () => {
    const app = buildApp();

    const res = await app.request('/products/..-secret.txt');

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('Bad Request');
  });

  it('rejeita upload com assinatura de arquivo inválida', async () => {
    const app = buildApp();
    const bucket = { put: jest.fn() };
    const formData = new FormData();
    formData.set(
      'file',
      new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], 'falso.png', {
        type: 'image/png',
      })
    );

    const res = await app.request(
      '/',
      {
        method: 'POST',
        body: formData,
      },
      { BUCKET: bucket }
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: 'O conteúdo do arquivo não corresponde à sua extensão.',
    });
    expect(bucket.put).not.toHaveBeenCalled();
  });
});
