import { Hono } from 'hono';
import pool from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
const router = new Hono();

router.use('*', authMiddleware);

// GET /api/services
router.get('/', async (c) => {
  try {
    const user = c.get('user');
    let customer_id = c.req.query('customer_id');
    let query = 'SELECT * FROM services';
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
    console.error('Services GET error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// GET /api/services/:id
router.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    
    if (rows.length === 0) return c.json({ error: 'Serviço não encontrado' }, 404);
    
    // Prevent customer from viewing other customer's services
    if (user.role === 'customer' && rows[0].customer_id !== user.id) {
      return c.json({ error: 'Acesso negado' }, 403);
    }
    
    return c.json(rows[0]);
  } catch (err) {
    console.error('Services GET /:id error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// POST /api/services (Admin Only)
router.post('/', adminOnly, async (c) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, customer_name, description, device, status, value, cost, notes, deadline, products_used } = await c.req.json();

    const { rows } = await client.query(
      `INSERT INTO services (customer_id, customer_name, description, device, status, value, cost, notes, deadline, products_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [customer_id, customer_name, description, device || '', status || 'pendente', value || 0, cost || 0,
       notes || '', deadline || null, JSON.stringify(products_used || [])]
    );

    const service = rows[0];

    // Deduct stock for used products preventing race conditions
    if (products_used && products_used.length > 0) {
      for (const p of products_used) {
        const parsedQtd = parseInt(p.quantity, 10);
        if (isNaN(parsedQtd) || parsedQtd <= 0) {
           throw new Error('Quantidade inválida de produtos');
        }

        const { rowCount } = await client.query(
          'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2 AND quantity >= $1',
          [parsedQtd, p.productId]
        );
        
        if (rowCount === 0) {
           throw new Error(`Estoque insuficiente para o produto ID ${p.productId}`);
        }

        await client.query(
          `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
           VALUES ($1, $2, 'saida', $3, $4, NOW())`,
          [p.productId, p.name, parsedQtd, `Serviço #${service.id}`]
        );
      }
    }

    await client.query('COMMIT');
    return c.json(service, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Services POST error:', err.message);
    // Be careful not to leak raw DB errors unless it's the stock error thrown manually
    if (err.message.includes('Estoque insuficiente') || err.message.includes('Quantidade inválida')) {
       return c.json({ error: err.message }, 400);
    }
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  } finally {
    client.release();
  }
});

// PUT /api/services/:id (Admin Only)
router.put('/:id', adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { customer_id, customer_name, description, device, status, value, cost, notes, deadline, products_used } = await c.req.json();
    const { rows } = await pool.query(
      `UPDATE services SET customer_id=COALESCE($1,customer_id), customer_name=COALESCE($2,customer_name),
       description=COALESCE($3,description), device=COALESCE($4,device), status=COALESCE($5,status),
       value=COALESCE($6,value), cost=COALESCE($7,cost), notes=COALESCE($8,notes),
       deadline=COALESCE($9,deadline), products_used=COALESCE($10,products_used), updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [customer_id, customer_name, description, device, status, value, cost, notes, deadline,
       products_used ? JSON.stringify(products_used) : null, id]
    );
    if (rows.length === 0) return c.json({ error: 'Serviço não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Services PUT error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// PATCH /api/services/:id/status (Admin Only)
router.patch('/:id/status', adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const { rows } = await pool.query(
      'UPDATE services SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) return c.json({ error: 'Serviço não encontrado' }, 404);
    return c.json(rows[0]);
  } catch (err) {
    console.error('Services PATCH error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

// DELETE /api/services/:id (Admin Only)
router.delete('/:id', adminOnly, async (c) => {
  try {
    const id = c.req.param('id');
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [id]);
    if (rowCount === 0) return c.json({ error: 'Serviço não encontrado' }, 404);
    return c.json({ message: 'Serviço excluído' });
  } catch (err) {
    console.error('Services DELETE error:', err.message);
    return c.json({ error: 'Erro interno no Servidor' }, 500);
  }
});

export default router;



