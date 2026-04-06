import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono, Context, Next } from 'hono';

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

const { default: paymentsRoutes } = await import('../src/routes/payments');

function buildDbMock(handlers: any = {}) {
  const query = jest.fn(async (text: string, params: any) => {
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

type Variables = {
  db: ReturnType<typeof buildDbMock>;
  user?: { id: string; role: string };
};

function buildApp(db: ReturnType<typeof buildDbMock>) {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    const userId = c.req.header('x-test-user-id');
    if (userId) {
      c.set('user', {
        id: userId,
        role: c.req.header('x-test-user-role') || 'customer',
      });
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
      query: async (text: string, _params: any[] = []) => {
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
    const createdJson = await created.json() as any;
    expect(createdJson).toEqual(
      expect.objectContaining({
        id: 999,
        external_reference: '12',
        lookup_token: expect.any(String),
      })
    );

    const forbiddenStatus = await app.request(
      '/pix/999/status',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 12,
          lookupToken: 'f'.repeat(64),
        }),
      },
      { MERCADO_PAGO_ACCESS_TOKEN: 'token' }
    );
    expect(forbiddenStatus.status).toBe(403);

    const status = await app.request(
      '/pix/999/status',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 12,
          lookupToken: createdJson.lookup_token,
        }),
      },
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
    let updatedProducts = 0;
    let insertedInventoryLogs = 0;

    const clientQuery = jest.fn(async (text: string, params: any[] = []) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rowCount: 0, rows: [] };
      }

      if (text.includes('SELECT id, total, status, customer_name, items, payment_method FROM orders WHERE id = $1 FOR UPDATE')) {
        return {
          rows: [{
            id: 12,
            total: 15,
            status: orderStatus,
            customer_name: 'Ana',
            items: [{ productId: '1', name: 'Erva', quantity: 1 }],
            payment_method: 'pix',
          }],
        };
      }

      if (text.includes('UPDATE products AS p')) {
        updatedProducts += 1;
        return { rowCount: 1, rows: [{ id: 1 }] };
      }

      if (text.startsWith('INSERT INTO inventory_log')) {
        insertedInventoryLogs += 1;
        return { rowCount: 1, rows: [] };
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
      query: async (text: string, _params: any[] = []) => {
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
    expect(updatedProducts).toBe(1);
    expect(insertedInventoryLogs).toBe(1);
  });
});
