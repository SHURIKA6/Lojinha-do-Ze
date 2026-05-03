import { Database, UserDB } from '../../core/types';

/**
 * Busca um usuário pelo endereço de e-mail.
 *
 * @param client - Instância do cliente do banco de dados
 * @param email - Endereço de e-mail a ser pesquisado
 * @returns Objeto do usuário se encontrado, null caso contrário
 */
export async function findByEmail(client: Database, email: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at, login_attempts, locked_until FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

/**
 * Busca um usuário pelo seu identificador único.
 *
 * @param client - Instância do cliente do banco de dados
 * @param id - ID único do usuário a ser pesquisado
 * @returns Objeto do usuário se encontrado, null caso contrário
 */
export async function findById(client: Database, id: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at, login_attempts, locked_until FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Busca um usuário pelo CPF (Cadastro de Pessoas Físicas).
 *
 * @param client - Instância do cliente do banco de dados
 * @param cpf - Número do CPF a ser pesquisado
 * @returns Objeto do usuário se encontrado, null caso contrário
 */
export async function findByCpf(client: Database, cpf: string): Promise<UserDB | null> {
  const { rows } = await client.query(
    'SELECT id, password, role, name, email, phone, cpf, address, avatar, created_at, updated_at, login_attempts, locked_until FROM users WHERE cpf = $1',
    [cpf]
  );
  return rows[0] || null;
}

/**
 * Atualiza o contador de tentativas de login e o status de bloqueio de um usuário.
 * Utilizado para implementar bloqueio de conta após múltiplas tentativas de login falhas.
 *
 * @param client - Instância do cliente do banco de dados
 * @param userId - ID do usuário
 * @param attempts - Novo número de tentativas de login
 * @param lockedUntil - Data opcional até a qual a conta estará bloqueada (null se não estiver bloqueada)
 * @returns Promise que resolve quando a atualização for concluída
 */
export async function updateLoginAttempts(client: Database, userId: number, attempts: number, lockedUntil: Date | null = null): Promise<void> {
  await client.query(
    'UPDATE users SET login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3',
    [attempts, lockedUntil ? lockedUntil.toISOString() : null, userId]
  );
}




