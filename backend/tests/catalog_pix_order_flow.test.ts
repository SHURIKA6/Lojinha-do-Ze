import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Hono } from 'hono';

const { default: catalogRoutes } = await import('../src/routes/catalog');

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
};

function buildApp(db: ReturnType<typeof buildDbMock>) {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });
  app.route('/', catalogRoutes);
  return app;
}

describe('Catalog Pix Order Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria pedido Pix baixando estoque no momento da criação para reserva', async () => {
    let insertedStatus = '';
    let updatedProducts = 0;
    let inventoryLogs = 0;

    const clientQuery = jest.fn(async (text: string, params: any[] = []) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rowCount: 0, rows: [] };
      }

      if (text.includes('SELECT id, name, sale_price, quantity')) {
        return {
          rows: [{ id: '1', name: 'Erva', sale_price: '10.00', quantity: 5 }],
        };
      }

      if (text.includes('INSERT INTO orders')) {
        insertedStatus = String(params[7]);
        return {
          rows: [
            {
              id: 101,
              customer_id: null,
              customer_name: 'Ana',
              customer_phone: '(65) 99999-0000',
              items: [{ productId: '1', name: 'Erva', quantity: 1, price: 10, subtotal: 10 }],
              subtotal: 10,
              delivery_fee: 5,
              total: 15,
              status: params[7],
              delivery_type: 'entrega',
              address: 'Rua A, 123',
              payment_method: 'pix',
              notes: '',
              created_at: '2026-04-06T00:00:00.000Z',
              updated_at: '2026-04-06T00:00:00.000Z',
            },
          ],
        };
      }

      if (text.includes('UPDATE products AS p')) {
        updatedProducts += 1;
        return { rowCount: 1, rows: [{ id: 1 }] };
      }

      if (text.startsWith('INSERT INTO inventory_log')) {
        inventoryLogs += 1;
        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Query client não tratada no teste: ${text}`);
    });

    const db = buildDbMock({ clientQuery });
    const app = buildApp(db);

    const response = await app.request(
      '/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Ana',
          customer_phone: '(65) 99999-0000',
          items: [{ productId: '1', quantity: 1 }],
          delivery_type: 'entrega',
          address: 'Rua A, 123',
          payment_method: 'pix',
          notes: '',
        }),
      },
      { DELIVERY_FEE: '5' }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        order: expect.objectContaining({ status: 'novo' }),
        message: expect.stringContaining('criado com sucesso!'),
      })
    );
    expect(insertedStatus).toBe('novo');
    // Agora esperamos que o estoque SEJA baixado
    expect(updatedProducts).toBe(1);
    expect(inventoryLogs).toBe(1);
  });
});
