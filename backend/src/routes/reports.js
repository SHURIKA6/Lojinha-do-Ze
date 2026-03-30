import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth.js';
import { jsonError, setNoStore } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../domain/constants.js';

const router = new Hono();

router.use('*', authMiddleware, adminOnly);

function parsePaginationParams(c) {
  const limit = Math.min(parseInt(c.req.query('limit')) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(parseInt(c.req.query('offset')) || 0, 0);
  return { limit, offset };
}

router.get('/:type', async (c) => {
  try {
    const db = c.get('db');
    const type = c.req.param('type');
    const { limit, offset } = parsePaginationParams(c);
    let data;

    switch (type) {
      case 'vendas': {
        const { rows } = await db.query(
          `SELECT id, customer_name, customer_phone, items, status, total, created_at
           FROM orders
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        data = rows;
        break;
      }

      case 'estoque': {
        const { rows } = await db.query(
          `SELECT id, code, name, category, quantity, min_stock, cost_price, sale_price, supplier, is_active
           FROM products
           ORDER BY name
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        data = rows;
        break;
      }

      // PERF-03: Substituída subquery correlacionada por LEFT JOIN + GROUP BY
      case 'clientes': {
        const { rows } = await db.query(
          `SELECT u.id, u.name, u.email, u.phone, u.cpf, u.created_at,
                  COUNT(o.id) AS order_count
           FROM users u
           LEFT JOIN orders o ON o.customer_id = u.id
           WHERE u.role = 'customer'
           GROUP BY u.id, u.name, u.email, u.phone, u.cpf, u.created_at
           ORDER BY u.name
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        data = rows;
        break;
      }

      case 'financeiro': {
        const [txResult, incomeRow, expenseRow] = await Promise.all([
          db.query(
            `SELECT id, type, category, description, value, date, order_id, created_at
             FROM transactions
             ORDER BY date DESC, created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
          ),
          db.query(
            "SELECT COALESCE(SUM(value), 0) AS total FROM transactions WHERE type = 'receita'"
          ),
          db.query(
            "SELECT COALESCE(SUM(value), 0) AS total FROM transactions WHERE type = 'despesa'"
          ),
        ]);

        data = {
          transactions: txResult.rows,
          total_income: parseFloat(incomeRow.rows[0].total),
          total_expense: parseFloat(expenseRow.rows[0].total),
          profit: parseFloat(incomeRow.rows[0].total) - parseFloat(expenseRow.rows[0].total),
        };
        break;
      }

      case 'inadimplencia': {
        const [pendingResult, totalResult] = await Promise.all([
          db.query(
            `SELECT id, customer_name, customer_phone, status, total
             FROM orders
             WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
          ),
          db.query(
            `SELECT COALESCE(SUM(total), 0) AS total
             FROM orders
             WHERE status IN ('novo', 'recebido', 'em_preparo', 'saiu_entrega')`
          ),
        ]);

        data = {
          orders: pendingResult.rows,
          total_pending: parseFloat(totalResult.rows[0].total),
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
    logger.error('Erro no GET de Relatórios', error, { type: c.req.param('type') });
    return jsonError(c, 500, 'Erro ao gerar os dados do relatório.');
  }
});

// Endpoint para exportação em CSV (Exemplo: orders)
router.post('/export/csv', async (c) => {
  try {
    const db = c.get('db');
    const body = await c.req.json();
    const { reportType } = body; // 'vendas', 'estoque', etc

    let csvContent = '';
    
    if (reportType === 'vendas') {
      const { rows } = await db.query(
        `SELECT id, customer_name, status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 500`
      );
      csvContent += 'ID,Cliente,Status,Total,Data\n';
      rows.forEach(r => {
        csvContent += `${r.id},"${r.customer_name}",${r.status},${r.total},"${new Date(r.created_at).toISOString()}"\n`;
      });
    } else if (reportType === 'estoque') {
      const { rows } = await db.query(
        `SELECT id, code, name, quantity, cost_price, sale_price FROM products ORDER BY name LIMIT 500`
      );
      csvContent += 'ID,Codigo,Nome,Quantidade,Custo,PrecoVenda\n';
      rows.forEach(r => {
        csvContent += `${r.id},${r.code},"${r.name}",${r.quantity},${r.cost_price},${r.sale_price}\n`;
      });
    } else {
      return jsonError(c, 400, 'Tipo de relatório para exportação não suportado.');
    }

    // Configurando headers para download de arquivo CSV diretamente no browser
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv"`);
    return c.body(csvContent);
  } catch (error) {
    logger.error('Erro ao exportar CSV', error);
    return jsonError(c, 500, 'Erro ao exportar os dados do relatório.');
  }
});

export default router;
