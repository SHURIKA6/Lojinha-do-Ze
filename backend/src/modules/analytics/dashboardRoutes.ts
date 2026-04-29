import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../../core/middleware/auth';
import { jsonError, setNoStore } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { Bindings, Variables } from '../../core/types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toObjectArray<T = Record<string, unknown>>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

router.use('*', authMiddleware, adminOnly);

router.get('/', async (c) => {
  try {
    const db = c.get('db');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Merge all 9 queries into a single statement to minimize round-trips
    const dashboardQuery = `
      WITH revenue AS (
        SELECT COALESCE(SUM(value), 0) AS total FROM transactions 
        WHERE type = 'receita' AND date BETWEEN $1 AND $2
      ),
      expenses AS (
        SELECT COALESCE(SUM(value), 0) AS total FROM transactions 
        WHERE type = 'despesa' AND date BETWEEN $1 AND $2
      ),
      active_orders AS (
        SELECT COUNT(*) AS count FROM orders 
        WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')
      ),
      total_sales AS (
        SELECT COUNT(*) AS count FROM orders 
        WHERE status = 'concluido'
      ),
      low_stock_list AS (
        SELECT COALESCE(json_agg(t), '[]'::json) as data FROM (
           SELECT id, name, quantity, min_stock FROM products 
           WHERE quantity <= min_stock ORDER BY quantity ASC
        ) t
      ),
      recent_orders_list AS (
        SELECT COALESCE(json_agg(t), '[]'::json) as data FROM (
          SELECT id, customer_name, delivery_type, status, total FROM orders 
          ORDER BY created_at DESC LIMIT 5
        ) t
      ),
      daily_tx_list AS (
        SELECT COALESCE(json_agg(t), '[]'::json) as data FROM (
          SELECT DATE(date) AS day_date, type, SUM(value) AS total FROM transactions 
          WHERE date BETWEEN $1 AND $2 
          GROUP BY DATE(date), type ORDER BY DATE(date)
        ) t
      ),
      category_list AS (
        SELECT COALESCE(json_agg(t), '[]'::json) as data FROM (
          SELECT category AS name, COUNT(*) AS value FROM products GROUP BY category
        ) t
      ),
      visitors AS (
        SELECT COUNT(DISTINCT session_id) AS count FROM analytics_events
        WHERE created_at BETWEEN $1 AND $2
      ),
      monthly_revenue_list AS (
        SELECT COALESCE(json_agg(t), '[]'::json) as data FROM (
          SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(value) AS total 
          FROM transactions 
          WHERE type = 'receita' AND date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month ASC
        ) t
      )
      SELECT 
        (SELECT total FROM revenue) as month_revenue,
        (SELECT total FROM expenses) as month_expenses,
        (SELECT count FROM active_orders) as active_orders_count,
        (SELECT count FROM total_sales) as total_sales_count,
        (SELECT data FROM low_stock_list) as low_stock,
        (SELECT data FROM recent_orders_list) as recent_orders,
        (SELECT data FROM daily_tx_list) as daily_tx,
        (SELECT data FROM category_list) as category_chart,
        (SELECT count FROM visitors) as unique_visitors,
        (SELECT data FROM monthly_revenue_list) as monthly_revenue;
    `;

    const res = await db.query(dashboardQuery, [monthStart, monthEnd]);
    const row = res.rows[0] || {};

    const chartData: Record<string, { day: string; receita: number; despesa: number }> = {};
    const dailyTx = toObjectArray<any>(row.daily_tx);
    
    dailyTx.forEach((item: any) => {
      if (!item.day_date) return;
      try {
        const day = new Date(item.day_date).toISOString().split('T')[0];
        if (!chartData[day]) {
          chartData[day] = { day, receita: 0, despesa: 0 };
        }
        if (item.type === 'receita') {
          chartData[day].receita = toNumber(item.total);
        } else {
          chartData[day].despesa = toNumber(item.total);
        }
      } catch (e) {}
    });

    const lowStock = toObjectArray<any>(row.low_stock);
    const recentOrders = toObjectArray<any>(row.recent_orders);
    const categoryChart = toObjectArray<any>(row.category_chart).map((item: any) => ({
      name: String(item?.name || ''),
      value: toNumber(item?.value),
    }));

    setNoStore(c as any);
    return c.json({
      monthRevenue: toNumber(row.month_revenue),
      monthExpenses: toNumber(row.month_expenses),
      profit: toNumber(row.month_revenue) - toNumber(row.month_expenses),
      activeOrders: Math.trunc(toNumber(row.active_orders_count)),
      totalSales: Math.trunc(toNumber(row.total_sales_count)),
      lowStock,
      recentOrders,
      chartData: Object.values(chartData),
      categoryChart,
      uniqueVisitors: toNumber(row.unique_visitors),
      conversionRate: toNumber(row.unique_visitors) > 0 
        ? (toNumber(row.total_sales_count) / toNumber(row.unique_visitors)) * 100 
        : 0,
      monthlyRevenue: toObjectArray<any>(row.monthly_revenue)
    });
  } catch (error) {
    logger.error('Erro no Dashboard', error as Error);
    return jsonError(c, 500, 'Erro ao carregar o dashboard das métricas.');
  }
});

export default router;
