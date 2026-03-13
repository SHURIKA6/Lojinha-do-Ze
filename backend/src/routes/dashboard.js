import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Month revenue (receita)
    const { rows: revRow } = await pool.query(
      "SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type='receita' AND date BETWEEN $1 AND $2",
      [monthStart, monthEnd]
    );

    // Month expenses (despesa)
    const { rows: expRow } = await pool.query(
      "SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type='despesa' AND date BETWEEN $1 AND $2",
      [monthStart, monthEnd]
    );

    // Active orders (novo, recebido, em_preparo, saiu_entrega)
    const { rows: activeRow } = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')"
    );

    // Total completed sales (concluido)
    const { rows: salesRow } = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status = 'concluido'"
    );

    // Low stock
    const { rows: lowStock } = await pool.query(
      'SELECT * FROM products WHERE quantity <= min_stock ORDER BY quantity ASC'
    );

    // Recent orders
    const { rows: recentOrders } = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'
    );

    // Chart data
    const { rows: dailyTx } = await pool.query(
      `SELECT DATE(date) as day_date, type, SUM(value) as total FROM transactions
       WHERE date BETWEEN $1 AND $2 GROUP BY DATE(date), type ORDER BY DATE(date)`,
      [monthStart, monthEnd]
    );

    const { rows: catData } = await pool.query(
      `SELECT category as name, COUNT(*) as value FROM products GROUP BY category`
    );

    const chartData = {};
    dailyTx.forEach(row => {
      const day = new Date(row.day_date).toISOString().split('T')[0];
      if (!chartData[day]) chartData[day] = { day, receita: 0, despesa: 0 };
      if (row.type === 'receita') chartData[day].receita = parseFloat(row.total);
      else chartData[day].despesa = parseFloat(row.total);
    });

    return c.json({
      monthRevenue: parseFloat(revRow[0].total),
      monthExpenses: parseFloat(expRow[0].total),
      profit: parseFloat(revRow[0].total) - parseFloat(expRow[0].total),
      activeOrders: parseInt(activeRow[0].count),
      totalSales: parseInt(salesRow[0].count),
      lowStock,
      recentOrders,
      chartData: Object.values(chartData),
      categoryChart: catData.map(c => ({ name: c.name, value: parseFloat(c.value) })),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return c.json({ error: 'Erro interno no Dashboard' }, 500);
  }
});

export default router;
