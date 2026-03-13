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
        const { rows: orders } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        data = orders;
        break;

      case 'estoque':
        const { rows: products } = await pool.query('SELECT * FROM products ORDER BY name');
        data = products;
        break;

      case 'clientes':
        const { rows: customers } = await pool.query(
          `SELECT 
            u.id, u.name, u.email, u.phone, u.cpf, u.address, u.avatar, u.created_at,
            (SELECT COUNT(*) FROM orders WHERE customer_id = u.id OR customer_phone = u.phone) as order_count
           FROM users u 
           WHERE u.role = 'customer' 
           ORDER BY u.name`
        );
        data = customers;
        break;

      case 'financeiro':
        const { rows: transactions } = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        const { rows: incomeRow } = await pool.query("SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type = 'receita'");
        const { rows: expenseRow } = await pool.query("SELECT COALESCE(SUM(value),0) as total FROM transactions WHERE type = 'despesa'");
        data = {
          transactions,
          total_income: parseFloat(incomeRow[0].total),
          total_expense: parseFloat(expenseRow[0].total),
          profit: parseFloat(incomeRow[0].total) - parseFloat(expenseRow[0].total),
        };
        break;

      case 'inadimplencia':
        // Pedidos em andamento / não concluídos
        const { rows: pending } = await pool.query(
          "SELECT * FROM orders WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega') ORDER BY created_at DESC"
        );
        const { rows: totalRow } = await pool.query(
          "SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')"
        );
        data = {
          orders: pending,
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


