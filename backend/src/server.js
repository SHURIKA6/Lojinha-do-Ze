import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authMiddleware, adminOnly } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import customersRoutes from './routes/customers.js';
import transactionsRoutes from './routes/transactions.js';
import reportsRoutes from './routes/reports.js';
import catalogRoutes from './routes/catalog.js';
import ordersRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';

const app = new Hono();

// Middleware
app.use('*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', message: 'Lojinha do Zé API' });
});

// Global Error Handler to avoid leaking internal DB data
app.onError((err, c) => {
  console.error('Unhandled Server Error:', err);
  return c.json({ error: 'Erro interno no Servidor' }, 500);
});

// Public routes (no auth)
app.route('/api/catalog', catalogRoutes);

// Authenticated routes
app.route('/api/auth', authRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/transactions', transactionsRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/upload', uploadRoutes);

// User profile update
import pool from './db.js';

app.put('/api/profile', authMiddleware, async (c) => {
  try {
    const { name, email, phone, address } = await c.req.json();
    const user = c.get('user');
    const avatar = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : undefined;
    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email),
       phone=COALESCE($3,phone), address=COALESCE($4,address), avatar=COALESCE($5,avatar), updated_at=NOW()
       WHERE id=$6 RETURNING id, name, email, phone, cpf, address, avatar, role, created_at`,
      [name, email, phone, address, avatar, user.id]
    );
    return c.json(rows[0]);
  } catch (err) {
    console.error('Profile PUT error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// Dashboard data
app.get('/api/dashboard', authMiddleware, adminOnly, async (c) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')} 23:59:59`;

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

    // Active orders (em_preparo, recebido, saiu_entrega)
    const { rows: activeRow } = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status IN ('recebido', 'em_preparo', 'saiu_entrega')"
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

// Final handler for Worker
export default app;


