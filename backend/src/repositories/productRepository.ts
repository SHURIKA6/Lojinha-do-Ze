import { Database } from '../types';

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  photo: string;
  category: string;
  quantity: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  supplier: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductCreatePayload {
  code: string;
  name: string;
  description: string;
  photo: string;
  category: string;
  quantity: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  supplier: string;
  is_active: boolean;
}

export interface ProductUpdatePayload {
  code?: string;
  name?: string;
  description?: string;
  photo?: string;
  category?: string;
  quantity?: number;
  min_stock?: number;
  cost_price?: number;
  sale_price?: number;
  supplier?: string;
  is_active?: boolean;
}

export async function listProducts(client: Database, limit: number, offset: number) {
  const { rows } = await client.query(
    `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
     FROM products
     ORDER BY name
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getProductById(client: Database, id: string) {
  const { rows } = await client.query(
    `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
     FROM products
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createProduct(client: Database, p: ProductCreatePayload) {
  const { rows } = await client.query(
    `INSERT INTO products (code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
    [p.code, p.name, p.description, p.photo, p.category, p.quantity, p.min_stock, p.cost_price, p.sale_price, p.supplier, p.is_active]
  );
  return rows[0];
}

export async function updateProduct(client: Database, id: string, data: ProductUpdatePayload) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.code !== undefined) { values.push(data.code); fields.push(`code = $${values.length}`); }
  if (data.name !== undefined) { values.push(data.name); fields.push(`name = $${values.length}`); }
  if (data.description !== undefined) { values.push(data.description); fields.push(`description = $${values.length}`); }
  if (data.photo !== undefined) { values.push(data.photo); fields.push(`photo = $${values.length}`); }
  if (data.category !== undefined) { values.push(data.category); fields.push(`category = $${values.length}`); }
  if (data.quantity !== undefined) { values.push(data.quantity); fields.push(`quantity = $${values.length}`); }
  if (data.min_stock !== undefined) { values.push(data.min_stock); fields.push(`min_stock = $${values.length}`); }
  if (data.cost_price !== undefined) { values.push(data.cost_price); fields.push(`cost_price = $${values.length}`); }
  if (data.sale_price !== undefined) { values.push(data.sale_price); fields.push(`sale_price = $${values.length}`); }
  if (data.supplier !== undefined) { values.push(data.supplier); fields.push(`supplier = $${values.length}`); }
  if (data.is_active !== undefined) { values.push(data.is_active); fields.push(`is_active = $${values.length}`); }

  if (fields.length === 0) return getProductById(client, id);

  values.push(id);
  const { rows } = await client.query(
    `UPDATE products
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
    values
  );
  return rows[0];
}

export async function deleteProduct(client: Database, id: string) {
  const { rowCount } = await client.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount !== 0;
}

export async function createStockTransaction(client: Database, { type, category, description, value }: { type: string, category: string, description: string, value: number }) {
  await client.query(
    `INSERT INTO transactions (type, category, description, value, date)
     VALUES ($1, $2, $3, $4, NOW())`,
    [type, category, description, value]
  );
}

export async function getProductForUpdate(client: Database, id: string) {
  const { rows } = await client.query(
    'SELECT name, quantity, cost_price FROM products WHERE id = $1 FOR UPDATE',
    [id]
  );
  return rows[0] || null;
}
