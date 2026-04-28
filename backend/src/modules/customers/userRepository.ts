import { Database, UserDB } from '../../core/types';

export async function findByEmail(client: Database, email: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at, login_attempts, locked_until FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function findById(client: Database, id: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at, login_attempts, locked_until FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function findByCpf(client: Database, cpf: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at, login_attempts, locked_until FROM users WHERE cpf = $1',
    [cpf]
  );
  return rows[0] || null;
}

export async function updateLoginAttempts(client: Database, userId: number, attempts: number, lockedUntil: Date | null = null): Promise<void> {
  await client.query(
    'UPDATE users SET login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3',
    [attempts, lockedUntil ? lockedUntil.toISOString() : null, userId]
  );
}
