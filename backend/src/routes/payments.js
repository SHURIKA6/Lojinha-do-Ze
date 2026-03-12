import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = new Hono();

router.use('*', authMiddleware);

// GET /api/payments
router.get('/', async (c) => {
  try {
    const user = c.get('user');
    let customer_id = c.req.query('customer_id');
    let query = 'SELECT * FROM payments';
    let params = [];

    // Enforce isolation for regular customers
    if (user.role === 'customer') {
      customer_id = user.id;
    }

    if (customer_id) {
      query += ' WHERE customer_id = $1';
      params.push(customer_id);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    return c.json(rows);
  } catch (err) {
    console.error('Payments GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/payments (Admin Only)
router.post('/', adminOnly, async (c) => {
  try {
    const { service_id, customer_id, customer_name, description, total_value, method, installments } = await c.req.json();
    const { rows } = await pool.query(
      `INSERT INTO payments (service_id, customer_id, customer_name, description, total_value, paid_value, remaining_value, method, status, installments)
       VALUES ($1, $2, $3, $4, $5, 0, $5, $6, 'pendente', $7) RETURNING *`,
      [service_id || null, customer_id || null, customer_name || '', description, total_value || 0, method || '', installments || 1]
    );
    return c.json(rows[0], 201);
  } catch (err) {
    console.error('Payments POST error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/payments/:id/pay — Register a payment (Admin Only)
router.post('/:id/pay', adminOnly, async (c) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = c.req.param('id');
    const { amount, method } = await c.req.json();
    
    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
       await client.query('ROLLBACK');
       return c.json({ error: 'Valor do pagamento deve ser maior que zero' }, 400);
    }

    const { rows: payRows } = await client.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (payRows.length === 0) {
      await client.query('ROLLBACK');
      return c.json({ error: 'Pagamento não encontrado' }, 404);
    }

    const payment = payRows[0];
    const maxAllowed = parseFloat(payment.remaining_value);
    
    if (parsedAmount > maxAllowed) {
       await client.query('ROLLBACK');
       return c.json({ error: `Valor excede o restante da dívida (${maxAllowed})` }, 400);
    }

    const newPaid = parseFloat(payment.paid_value) + parsedAmount;
    const newRemaining = Math.max(0, parseFloat(payment.total_value) - newPaid);
    const newStatus = newRemaining <= 0 ? 'pago' : 'parcial';

    const { rows: updated } = await client.query(
      `UPDATE payments SET paid_value = $1, remaining_value = $2, status = $3, method = $4, date = NOW(), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [newPaid, newRemaining, newStatus, method, id]
    );

    // Create transaction entry
    await client.query(
      `INSERT INTO transactions (type, category, description, value, date) VALUES ('entrada', 'Serviço', $1, $2, CURRENT_DATE)`,
      [`Pagamento: ${payment.description}`, parsedAmount]
    );

    await client.query('COMMIT');
    return c.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payments PAY error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  } finally {
    client.release();
  }
});

// DELETE /api/payments/:id (Admin Only)
router.delete('/:id', adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { rowCount } = await pool.query('DELETE FROM payments WHERE id = $1', [id]);
    if (rowCount === 0) return c.json({ error: 'Pagamento não encontrado' }, 404);
    return c.json({ message: 'Pagamento excluído' });
  } catch (err) {
    console.error('Payments DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;



