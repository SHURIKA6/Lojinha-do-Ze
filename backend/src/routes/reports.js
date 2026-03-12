import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = new Hono();

router.use('*', authMiddleware, adminOnly);

// GET /api/reports/:type
router.get('/:type', async (c) => {
  try {
    const type = c.req.param('type');
    let data;

    switch (type) {
      case 'vendas':
        const { rows: services } = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
        data = services;
        break;

      case 'estoque':
        const { rows: products } = await pool.query('SELECT * FROM products ORDER BY name');
        data = products;
        break;

      case 'clientes':
        const { rows: customers } = await pool.query(
          "SELECT id, name, email, phone, cpf, address, avatar, created_at FROM users WHERE role = 'customer' ORDER BY name"
        );
        // Attach service count
        for (const cust of customers) {
          const { rows: svcCount } = await pool.query(
            'SELECT COUNT(*) FROM services WHERE customer_id = $1', [cust.id]
          );
          cust.service_count = parseInt(svcCount[0].count);
        }
        data = customers;
        break;

      case 'financeiro':
        const { rows: transactions } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        const { rows: incomeRow } = await pool.query("SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type = 'entrada'");
        const { rows: expenseRow } = await pool.query("SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type = 'saida'");
        data = {
          transactions,
          total_income: parseFloat(incomeRow[0].total),
          total_expense: parseFloat(expenseRow[0].total),
          profit: parseFloat(incomeRow[0].total) - parseFloat(expenseRow[0].total),
        };
        break;

      case 'inadimplencia':
        const { rows: pending } = await pool.query("SELECT * FROM payments WHERE status != 'pago' ORDER BY created_at DESC");
        const { rows: totalRow } = await pool.query("SELECT COALESCE(SUM(remaining_value),0) as total FROM payments WHERE status != 'pago'");
        data = {
          payments: pending,
          total_pending: parseFloat(totalRow[0].total),
        };
        break;

      default:
        return c.json({ error: 'Tipo de relatório inválido' }, 400);
    }

    return c.json(data);
  } catch (err) {
    console.error('Reports GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;


