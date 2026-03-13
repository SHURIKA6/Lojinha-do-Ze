import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth.js';
import { jsonError, setNoStore } from '../utils/http.js';

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

router.get('/:type', async (c) => {
  try {
    const db = c.get('db');
    const type = c.req.param('type');
    let data;

    switch (type) {
      case 'vendas': {
        const { rows } = await db.query(
          `SELECT id, customer_name, customer_phone, items, status, total, created_at
           FROM orders
           ORDER BY created_at DESC`
        );
        data = rows;
        break;
      }

      case 'estoque': {
        const { rows } = await db.query(
          `SELECT id, code, name, category, quantity, min_stock, cost_price, sale_price, supplier, is_active
           FROM products
           ORDER BY name`
        );
        data = rows;
        break;
      }

      case 'clientes': {
        const { rows } = await db.query(
          `SELECT u.id, u.name, u.email, u.phone, u.cpf, u.created_at,
                  (
                    SELECT COUNT(*)
                    FROM orders o
                    WHERE o.customer_id = u.id OR o.customer_phone = u.phone
                  ) AS order_count
           FROM users u
           WHERE u.role = 'customer'
           ORDER BY u.name`
        );
        data = rows;
        break;
      }

      case 'financeiro': {
        const { rows: transactions } = await db.query(
          `SELECT id, type, category, description, value, date
           FROM transactions
           ORDER BY date DESC`
        );
        const { rows: incomeRow } = await db.query(
          "SELECT COALESCE(SUM(value), 0) AS total FROM transactions WHERE type = 'receita'"
        );
        const { rows: expenseRow } = await db.query(
          "SELECT COALESCE(SUM(value), 0) AS total FROM transactions WHERE type = 'despesa'"
        );

        data = {
          transactions,
          total_income: parseFloat(incomeRow[0].total),
          total_expense: parseFloat(expenseRow[0].total),
          profit: parseFloat(incomeRow[0].total) - parseFloat(expenseRow[0].total),
        };
        break;
      }

      case 'inadimplencia': {
        const { rows: pending } = await db.query(
          `SELECT id, customer_name, customer_phone, status, total
           FROM orders
           WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')
           ORDER BY created_at DESC`
        );
        const { rows: totalRow } = await db.query(
          `SELECT COALESCE(SUM(total), 0) AS total
           FROM orders
           WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')`
        );

        data = {
          orders: pending,
          total_pending: parseFloat(totalRow[0].total),
        };
        break;
      }

      default:
        setNoStore(c);
        return jsonError(c, 400, 'Tipo de relatório inválido');
    }

    setNoStore(c);
    return c.json(data);
  } catch (error) {
    console.error('Reports GET error:', error);
    return jsonError(c, 500, 'Erro interno no servidor');
  }
});

export default router;
