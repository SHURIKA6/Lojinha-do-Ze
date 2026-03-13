import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth.js';
import { jsonError, setNoStore } from '../utils/http.js';

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const { rows: revRow } = await db.query(
      `SELECT COALESCE(SUM(value), 0) AS total
       FROM transactions
       WHERE type = 'receita' AND date BETWEEN $1 AND $2`,
      [monthStart, monthEnd]
    );

    const { rows: expRow } = await db.query(
      `SELECT COALESCE(SUM(value), 0) AS total
       FROM transactions
       WHERE type = 'despesa' AND date BETWEEN $1 AND $2`,
      [monthStart, monthEnd]
    );

    const { rows: activeRow } = await db.query(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')`
    );

    const { rows: salesRow } = await db.query(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE status = 'concluido'`
    );

    const { rows: lowStock } = await db.query(
      `SELECT id, name, quantity, min_stock
       FROM products
       WHERE quantity <= min_stock
       ORDER BY quantity ASC`
    );

    const { rows: recentOrders } = await db.query(
      `SELECT id, customer_name, delivery_type, status, total
       FROM orders
       ORDER BY created_at DESC
       LIMIT 5`
    );

    const { rows: dailyTx } = await db.query(
      `SELECT DATE(date) AS day_date, type, SUM(value) AS total
       FROM transactions
       WHERE date BETWEEN $1 AND $2
       GROUP BY DATE(date), type
       ORDER BY DATE(date)`,
      [monthStart, monthEnd]
    );

    const { rows: catData } = await db.query(
      `SELECT category AS name, COUNT(*) AS value
       FROM products
       GROUP BY category`
    );

    const chartData = {};
    dailyTx.forEach((row) => {
      const day = new Date(row.day_date).toISOString().split('T')[0];
      if (!chartData[day]) {
        chartData[day] = { day, receita: 0, despesa: 0 };
      }
      if (row.type === 'receita') {
        chartData[day].receita = parseFloat(row.total);
      } else {
        chartData[day].despesa = parseFloat(row.total);
      }
    });

    setNoStore(c);
    return c.json({
      monthRevenue: parseFloat(revRow[0].total),
      monthExpenses: parseFloat(expRow[0].total),
      profit: parseFloat(revRow[0].total) - parseFloat(expRow[0].total),
      activeOrders: parseInt(activeRow[0].count, 10),
      totalSales: parseInt(salesRow[0].count, 10),
      lowStock,
      recentOrders,
      chartData: Object.values(chartData),
      categoryChart: catData.map((item) => ({ name: item.name, value: parseFloat(item.value) })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return jsonError(c, 500, 'Erro interno no dashboard');
  }
});

export default router;
