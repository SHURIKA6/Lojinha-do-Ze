import { Hono } from 'hono';
import { createDb } from './db.js';
import { createCorsMiddleware, originGuardMiddleware, securityHeadersMiddleware } from './middleware/security.js';
import { isSafeMethod, jsonError } from './utils/http.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import customersRoutes from './routes/customers.js';
import dashboardRoutes from './routes/dashboard.js';
import ordersRoutes from './routes/orders.js';
import productsRoutes from './routes/products.js';
import profileRoutes from './routes/profile.js';
import reportsRoutes from './routes/reports.js';
import transactionsRoutes from './routes/transactions.js';
import uploadRoutes from './routes/upload.js';
import paymentRoutes from './routes/payments.js';

import { apiLimiter } from './middleware/rateLimit.js';
import { auditMiddleware } from './middleware/audit.js';
import { csrfMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { logger } from './utils/logger.js';

const app = new Hono();
const DBLESS_PATH_PREFIXES = ['/api/health'];
const DBLESS_SAFE_PREFIXES = ['/api/upload/products/'];

app.use('/api/*', apiLimiter);
app.use('/api/*', createCorsMiddleware());
app.use('/api/*', securityHeadersMiddleware);
app.use('/api/*', originGuardMiddleware);
app.use('/api/*', auditMiddleware);

app.get('/api/health', (c) => c.json({ status: 'ok', message: 'Lojinha do Zé API' }));

app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (DBLESS_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    await next();
    return;
  }

  if (isSafeMethod(c.req.method) && DBLESS_SAFE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    await next();
    return;
  }

  const connectionString = c.env?.DATABASE_URL;
  if (!connectionString) {
    logger.error('CRITICAL: DATABASE_URL is not configured for this request.');
    return jsonError(c, 500, 'Erro interno no servidor');
  }

  const db = createDb(connectionString);
  c.set('db', db);

  try {
    // Resolve a sessão (opcional) e aplica o middleware CSRF para métodos não-seguros
    await optionalAuthMiddleware(c, async () => {
      await csrfMiddleware(c, next);
    });
  } catch (error) {
    logger.error('Erro na Requisição API', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  } finally {
    const closePromise = db.close().catch((error) => {
      logger.warn('DB close error', { error: error?.message });
    });

    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(closePromise);
    } else {
      await closePromise;
    }
  }
});

app.onError((error, c) => {
  logger.error('Unhandled Global Error', error, {
    path: c.req.path,
    method: c.req.method,
    user: c.get('user')?.id,
  });
  return jsonError(c, 500, 'Erro interno no servidor');
});

app.route('/api/auth', authRoutes);
app.route('/api/catalog', catalogRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/transactions', transactionsRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/payments', paymentRoutes);

export default app;
