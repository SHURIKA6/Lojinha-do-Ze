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
import dashboardRoutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';

const app = new Hono();

// Middleware
app.use('*', cors());

import pool from './db.js';
app.use('*', async (c, next) => {
  if (c.env && c.env.DATABASE_URL) {
    pool.init(c.env.DATABASE_URL);
  }
  await next();
});

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
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/profile', profileRoutes);

// Final handler for Worker
export default app;


