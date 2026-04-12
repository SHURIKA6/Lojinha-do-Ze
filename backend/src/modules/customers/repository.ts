import { Database, CustomerCreateData, CustomerUpdateData } from '../types';

export async function findAllCustomers(db: Database, limit: number, offset: number) {
  const { rows } = await db.query(
    `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
     FROM (
       SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at FROM users
       UNION ALL
       SELECT
         MIN(id) as id, customer_name as name, NULL as email, customer_phone as phone,
         NULL as cpf, address, 'Cliente convidado' as notes, NULL as avatar, 'guest' as role,
         MIN(created_at) as created_at
       FROM orders
       WHERE customer_id IS NULL
       GROUP BY customer_name, customer_phone, address
     ) as combined_customers
     ORDER BY name
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function findCustomerById(db: Database, id: string) {
  const { rows: userRows } = await db.query(
    `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at FROM users WHERE id = $1`,
    [id]
  );

  if (userRows.length) {
    return userRows[0];
  }

  const { rows: guestRows } = await db.query(
    `SELECT MIN(id) as id, customer_name as name, null as email, customer_phone as phone,
     null as cpf, address, 'Cliente convidado' as notes, null as avatar, 'guest' as role,
     MIN(created_at) as created_at
   FROM orders
   WHERE customer_id IS NULL AND id::text = $1
   GROUP BY customer_name, customer_phone, address`,
    [id]
  );

  return guestRows.length ? guestRows[0] : null;
}

export async function findOrdersByCustomer(db: Database, id: string, normalizedPhone: string) {
  const { rows } = await db.query(
    `SELECT id, customer_name, customer_phone, items, total, status, delivery_type, payment_method, created_at
     FROM orders
     WHERE customer_id = $1 OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2)
     ORDER BY created_at DESC`,
    [id, normalizedPhone]
  );
  return rows;
}

export async function getCustomerStats(db: Database, id: string, normalizedPhone: string) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(total), 0) as total_spent, COUNT(*) as order_count
     FROM orders
     WHERE (customer_id = $1 OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2))
       AND status = 'concluido'`,
    [id, normalizedPhone]
  );
  return rows[0];
}

export async function createCustomer(db: Database, data: CustomerCreateData) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, notes, avatar)
     VALUES ($1, $2, NULL, false, 'customer', $3, $4, $5, $6, $7)
     RETURNING id, name, email, phone, cpf, address, notes, avatar, role, created_at`,
    [data.name, data.email, data.phone, data.cpf, data.address, data.notes, data.avatar]
  );
  return rows[0];
}

export async function updateCustomer(db: Database, id: string, data: CustomerUpdateData) {
  const { rows } = await db.query(
    `UPDATE users SET
       name = COALESCE($1, name),
       email = COALESCE($2, email),
       phone = COALESCE($3, phone),
       cpf = COALESCE($4, cpf),
       address = COALESCE($5, address),
       notes = COALESCE($6, notes),
       avatar = COALESCE($7, avatar),
       updated_at = NOW()
     WHERE id = $8
     RETURNING id, name, email, phone, cpf, address, notes, avatar, role, created_at`,
    [data.name, data.email, data.phone, data.cpf, data.address, data.notes, data.avatar, id]
  );
  return rows[0];
}

export async function updateCustomerRole(db: Database, id: string, role: string) {
  const { rows } = await db.query(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, role`,
    [role, id]
  );
  return rows[0];
}

export async function deleteCustomer(db: Database, id: string) {
  const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount !== null && rowCount > 0;
}

export async function getUserPassword(db: Database, id: string) {
  const { rows } = await db.query('SELECT password FROM users WHERE id = $1', [id]);
  return rows.length ? rows[0].password : null;
}
