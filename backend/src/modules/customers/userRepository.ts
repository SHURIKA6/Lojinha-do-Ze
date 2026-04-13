import { Database, UserDB } from '../../core/types';

export async function findByEmail(client: Database, email: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function findById(client: Database, id: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function findByCpf(client: Database, cpf: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at FROM users WHERE cpf = $1',
    [cpf]
  );
  return rows[0] || null;
}
