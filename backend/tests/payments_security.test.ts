import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono } from 'hono';
import { Bindings, Variables } from '../src/types';

const mockCreatePixPayment = jest.fn() as any;
const mockGetPayment = jest.fn() as any;

jest.unstable_mockModule('../src/services/mercadoPagoService', () => ({
  MercadoPagoService: class {
    async createPixPayment(payload: any) {
      return mockCreatePixPayment(payload);
    }

    async getPayment(paymentId: any) {
      return mockGetPayment(paymentId);
    }
  },
}));

const { default: paymentsRoutes } = await import('../src/routes/payments') as any;

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
      query: handlers.clientQuery || query,
      release() {},
    }),
    close: async () => {},
  };
}

function buildApp(db: any) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    const userId = c.req.header('x-test-user-id');
    if (userId) {
      c.set('user', {
        id: userId,
        role: (c.req.header('x-test-user-role') as any) || 'customer',
      } as any);
    }
    await next();
  });
  app.route('/', paymentsRoutes);
  return app;
}

async function signWebhook(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(signature), (value) =>
    value.toString(16).padStart(2, '0')
  ).join('');
  return `ts=${ts},v1=${hex}`;
}

describe('Payments Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('valida telefone e pedido ao criar e consultar pagamentos Pix', async () => {
    const db = buildDbMock({
      query: async (text: string, _params: any[]) => {
        if (text.includes('FROM orders') && text.includes('WHERE id = $1')) {
          return {
            rows: [
              {
                id: 12,
                total: 15,
                customer_name: 'Ana',
                customer_id: null,
                customer_phone: '(65) 99999-0000',
                payment_id: null,
              },
            ],
          };
        }

        if (text.includes('UPDATE orders SET payment_id = $1')) {
          return { rowCount: 1 };
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
    });
    const app = buildApp(db);
    mockCreatePixPayment.mockResolvedValue({
      id: 999,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      external_reference: '12',
    });
    mockGetPayment.mockResolvedValue({
      id: 999,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      external_reference: '12',
    });

    const forbiddenCreate = await app.request(
      '/pix',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 12,
          email: 'ana@example.com',
          phone: '(11) 99999-9999',
          firstName: 'Ana',
          lastName: 'Silva',
          identificationNumber: '12345678901',
        }),
      },
      { MERCADO_PAGO_ACCESS_TOKEN: 'token' }
    );

    expect(forbiddenCreate.status).toBe(403);

    const created = await app.request(
      '/pix',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 12,
          email: 'ana@example.com',
          phone: '(65) 99999-0000',
          firstName: 'Ana',
          lastName: 'Silva',
          identificationNumber: '12345678901',
        }),
      },
      { MERCADO_PAGO_ACCESS_TOKEN: 'token' }
    );

    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toEqual(
      expect.objectContaining({ id: 999, external_reference: '12' })
    );

    const forbiddenStatus = await app.request(
      '/pix/999?orderId=12&phone=(11)%2099999-9999',
      undefined,
      { MERCADO_PAGO_ACCESS_TOKEN: 'token' }
    );
    expect(forbiddenStatus.status).toBe(403);

    const status = await app.request(
      '/pix/999?orderId=12&phone=(65)%2099999-0000',
      undefined,
      { MERCADO_PAGO_ACCESS_TOKEN: 'token' }
    );

    expect(status.status).toBe(200);
    await expect(status.json()).resolves.toEqual({
      id: 999,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      external_reference: '12',
    });
  });

  it('processa webhook assinado de forma idempotente', async () => {
    let orderStatus = 'novo';
    let insertedTransactions = 0;

    const clientQuery = jest.fn(async (text: string, params: any[]) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rowCount: 0, rows: [] };
      }

      if (text.includes('SELECT total, status, customer_name FROM orders WHERE id = $1 FOR UPDATE')) {
        return {
          rows: [{ total: 15, status: orderStatus, customer_name: 'Ana' }],
        };
      }

      if (text.includes('UPDATE orders SET status = $2')) {
        orderStatus = params[1];
        return { rowCount: 1, rows: [] };
      }

      if (text.startsWith('INSERT INTO transactions')) {
        insertedTransactions += 1;
        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Query client não tratada no teste: ${text}`);
    });

    const db = buildDbMock({
      query: async (text: string, _params: any[]) => {
        if (text.includes('UPDATE orders SET payment_status = $1')) {
          return { rowCount: 1, rows: [] };
        }

        if (text.includes('SELECT id, payment_id FROM orders WHERE id = $1')) {
          return { rows: [{ id: 12, payment_id: null }] };
        }

        throw new Error(`Query não tratada no teste: ${text}`);
      },
      clientQuery,
    });

    const app = buildApp(db);
    mockGetPayment.mockResolvedValue({
      id: 999,
      status: 'approved',
      external_reference: '12',
    });

    const secret = 'webhook-secret';
    const requestId = 'req-123';
    const ts = '1711651200';
    const signature = await signWebhook(secret, '999', requestId, ts);

    const sendWebhook = () =>
      app.request(
        '/webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
            'x-signature': signature,
          },
          body: JSON.stringify({
            type: 'payment',
            data: { id: '999' },
          }),
        },
        {
          MERCADO_PAGO_ACCESS_TOKEN: 'token',
          MERCADO_PAGO_WEBHOOK_SECRET: secret,
        }
      );

    expect((await sendWebhook()).status).toBe(200);
    expect((await sendWebhook()).status).toBe(200);
    expect(insertedTransactions).toBe(1);
  });
});
