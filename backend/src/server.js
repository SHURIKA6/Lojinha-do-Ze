import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authMiddleware, adminOnly } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import customersRoutes from './routes/customers.js';
import servicesRoutes from './routes/services.js';
import paymentsRoutes from './routes/payments.js';
import transactionsRoutes from './routes/transactions.js';
import reportsRoutes from './routes/reports.js';
import catalogRoutes from './routes/catalog.js';
import ordersRoutes from './routes/orders.js';

const app = new Hono();

// Middleware
app.use('*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', message: 'Lojinha do Zé API' });
});

// Public routes (no auth)
app.route('/api/catalog', catalogRoutes);

// Authenticated routes
app.route('/api/auth', authRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/services', servicesRoutes);
app.route('/api/payments', paymentsRoutes);
app.route('/api/transactions', transactionsRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/orders', ordersRoutes);

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
    // Current month dates
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    // Month revenue
    const { rows: revRow } = await pool.query(
      "SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type='entrada' AND date BETWEEN $1 AND $2",
      [monthStart, monthEnd]
    );

    // Month expenses
    const { rows: expRow } = await pool.query(
      "SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type='saida' AND date BETWEEN $1 AND $2",
      [monthStart, monthEnd]
    );

    // Active services
    const { rows: activeRow } = await pool.query(
      "SELECT COUNT(*) FROM services WHERE status = 'em_andamento'"
    );

    // Pending payments total
    const { rows: pendingRow } = await pool.query(
      "SELECT COALESCE(SUM(remaining_value),0) as total FROM payments WHERE status != 'pago'"
    );

    // Low stock products
    const { rows: lowStock } = await pool.query(
      'SELECT * FROM products WHERE quantity <= min_stock ORDER BY quantity ASC'
    );

    // Total completed sales
    const { rows: salesRow } = await pool.query(
      "SELECT COUNT(*) FROM payments WHERE status = 'pago'"
    );

    // Recent services
    const { rows: recentServices } = await pool.query(
      'SELECT * FROM services ORDER BY created_at DESC LIMIT 5'
    );

    // Chart data: daily transactions for current month
    const { rows: dailyTx } = await pool.query(
      `SELECT date, type, SUM(value) as total FROM transactions
       WHERE date BETWEEN $1 AND $2 GROUP BY date, type ORDER BY date`,
      [monthStart, monthEnd]
    );

    const chartData = {};
    dailyTx.forEach(row => {
      const day = new Date(row.date).getDate().toString();
      if (!chartData[day]) chartData[day] = { day, receita: 0, despesa: 0 };
      if (row.type === 'entrada') chartData[day].receita = parseFloat(row.total);
      else chartData[day].despesa = parseFloat(row.total);
    });

    // Revenue by category
    const { rows: catData } = await pool.query(
      `SELECT category as name, SUM(value) as value FROM transactions
       WHERE type='entrada' AND date BETWEEN $1 AND $2 GROUP BY category`,
      [monthStart, monthEnd]
    );

    return c.json({
      monthRevenue: parseFloat(revRow[0].total),
      monthExpenses: parseFloat(expRow[0].total),
      profit: parseFloat(revRow[0].total) - parseFloat(expRow[0].total),
      activeServices: parseInt(activeRow[0].count),
      pendingTotal: parseFloat(pendingRow[0].total),
      lowStock,
      totalSales: parseInt(salesRow[0].count),
      recentServices,
      chartData: Object.values(chartData),
      categoryChart: catData.map(c => ({ name: c.name, value: parseFloat(c.value) })),
    });
  } catch (err) {
    console.error('Dashboard GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// Final handler for Worker
export default app;


