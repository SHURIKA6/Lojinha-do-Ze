import { beforeAll, describe, expect, it, jest } from '@jest/globals';

let Hono: any;
let dashboardRoutes: any;

beforeAll(async () => {
  const honoMod = await import('hono');
  Hono = honoMod.Hono;

  const dashboardMod = await import('../src/modules/analytics/dashboardRoutes');
  dashboardRoutes = dashboardMod.default;
});

function buildDbMock(row: Record<string, unknown>) {
  const query = jest.fn(async () => ({
    rows: [row],
  }));

  return {
    query,
    connect: async () => ({
      query,
      release() {},
    }),
    close: async () => {},
  };
}

function buildApp(db: any) {
  const app = new Hono();
  app.use('*', async (c: any, next: any) => {
    c.set('db', db);
    const session = {
      id: 'session-1',
      userId: '1',
      user: { id: '1', role: 'admin', name: 'Admin' },
      csrfToken: 'csrf',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    c.set('user', session.user);
    c.set('session', session);
    c.set('resolvedSession', session);
    await next();
  });

  app.route('/', dashboardRoutes);
  return app;
}

describe('Dashboard routes', () => {
  it('normaliza colunas JSON agregadas quando o driver devolve string', async () => {
    const app = buildApp(
      buildDbMock({
        month_revenue: '100.50',
        month_expenses: '40.25',
        active_orders_count: '3',
        total_sales_count: '8',
        low_stock: JSON.stringify([{ id: 1, name: 'Sabonete', quantity: 1, min_stock: 5 }]),
        recent_orders: JSON.stringify([{ id: 10, customer_name: 'Ana', delivery_type: 'entrega', status: 'novo', total: 25 }]),
        daily_tx: JSON.stringify([
          { day_date: '2026-04-01T00:00:00.000Z', type: 'receita', total: '100.50' },
          { day_date: '2026-04-01T00:00:00.000Z', type: 'despesa', total: '40.25' },
        ]),
        category_chart: JSON.stringify([
          { name: 'Naturais', value: '2' },
          { name: 'Chás e Infusões', value: '4' },
        ]),
      })
    );

    const res = await app.request('/');
    expect(res.status).toBe(200);

    await expect(res.json()).resolves.toEqual({
      monthRevenue: 100.5,
      monthExpenses: 40.25,
      profit: 60.25,
      activeOrders: 3,
      totalSales: 8,
      lowStock: [{ id: 1, name: 'Sabonete', quantity: 1, min_stock: 5 }],
      recentOrders: [{ id: 10, customer_name: 'Ana', delivery_type: 'entrega', status: 'novo', total: 25 }],
      chartData: [{ day: '2026-04-01', receita: 100.5, despesa: 40.25 }],
      categoryChart: [
        { name: 'Naturais', value: 2 },
        { name: 'Chás e Infusões', value: 4 },
      ],
    });
  });
});
