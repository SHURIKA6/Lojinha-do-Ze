import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth';
import { jsonError, setNoStore } from '../utils/http';
import { logger } from '../utils/logger';
import { Bindings, Variables } from '../types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const db = c.get('db');
    if (!db) {
      logger.error('Dashboard: db não disponível no contexto');
      return jsonError(c, 500, 'Erro interno: banco de dados indisponível.');
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [revRes, expRes, activeRes, salesRes, lowStockRes, recentRes, dailyTxRes, catRes] =
      await Promise.all([
        db.query(
          `SELECT COALESCE(SUM(value), 0) AS total FROM transactions
           WHERE type = 'receita' AND date BETWEEN $1 AND $2`,
          [monthStart, monthEnd]
        ),
        db.query(
          `SELECT COALESCE(SUM(value), 0) AS total FROM transactions
           WHERE type = 'despesa' AND date BETWEEN $1 AND $2`,
          [monthStart, monthEnd]
        ),
        db.query(
          `SELECT COUNT(*) AS count FROM orders
           WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')`
        ),
        db.query(`SELECT COUNT(*) AS count FROM orders WHERE status = 'concluido'`),
        db.query(
          `SELECT id, name, quantity, min_stock FROM products
           WHERE quantity <= min_stock ORDER BY quantity ASC`
        ),
        db.query(
          `SELECT id, customer_name, delivery_type, status, total FROM orders
           ORDER BY created_at DESC LIMIT 5`
        ),
        db.query(
          `SELECT DATE(date) AS day_date, type, SUM(value) AS total FROM transactions
           WHERE date BETWEEN $1 AND $2
           GROUP BY DATE(date), type ORDER BY DATE(date)`,
          [monthStart, monthEnd]
        ),
        db.query(`SELECT category AS name, COUNT(*) AS value FROM products GROUP BY category`),
      ]);

    const chartData: Record<string, { day: string; receita: number; despesa: number }> = {};
    for (const row of (dailyTxRes?.rows ?? [])) {
      try {
        const day = new Date(row.day_date).toISOString().split('T')[0];
        if (!chartData[day]) {
          chartData[day] = { day, receita: 0, despesa: 0 };
        }
        if (row.type === 'receita') {
          chartData[day].receita = parseFloat(row.total ?? '0');
        } else {
          chartData[day].despesa = parseFloat(row.total ?? '0');
        }
      } catch {
        // skip malformed row
      }
    }

    setNoStore(c as any);
    return c.json({
      monthRevenue: parseFloat(revRes.rows[0]?.total ?? '0'),
      monthExpenses: parseFloat(expRes.rows[0]?.total ?? '0'),
      profit: parseFloat(revRes.rows[0]?.total ?? '0') - parseFloat(expRes.rows[0]?.total ?? '0'),
      activeOrders: parseInt(activeRes.rows[0]?.count ?? '0', 10),
      totalSales: parseInt(salesRes.rows[0]?.count ?? '0', 10),
      lowStock: lowStockRes?.rows ?? [],
      recentOrders: recentRes?.rows ?? [],
      chartData: Object.values(chartData),
      categoryChart: (catRes?.rows ?? []).map((item: any) => ({ 
        name: item.name, 
        value: parseInt(item.value ?? '0', 10) 
      })),
    });
  } catch (error) {
    logger.error('Erro no Dashboard', error as Error, {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return jsonError(c, 500, 'Erro ao carregar o dashboard das métricas.');
  }
});

export default router;
