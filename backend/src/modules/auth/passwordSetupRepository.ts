import { Database } from '../../core/types';

/**
 * Representa um token de configuração de senha usado para ativação inicial da conta.
 * Estes tokens são enviados aos usuários para permitir que definam sua senha pela primeira vez.
 */
export interface PasswordSetupToken {
  /** Identificador único do token de configuração */
  id: string;
  /** ID do usuário ao qual este token pertence */
  userId: string;
  /** Hash SHA-256 do token bruto (o token bruto nunca é armazenado) */
  tokenHash: string;
  /** Código de configuração legível por humanos que pode ser compartilhado via SMS/email */
  setupCode: string;
  /** Data e hora em que este token expira */
  expiresAt: Date;
  /** Data e hora em que este token foi consumido (null se ainda for válido) */
  consumedAt?: Date | null;
}

/**
 * Revoga todos os tokens de configuração abertos (não utilizados) para um usuário específico.
 * Marca tokens existentes como consumidos para evitar reutilização ao gerar um novo token.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param userId - ID do usuário cujos tokens devem ser revogados
 */
export async function revokeOpenSetupTokensForUser(client: Database, userId: string) {
  await client.query(
    `UPDATE password_setup_tokens
     SET consumed_at = COALESCE(consumed_at, NOW())
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId]
  );
}

/**
 * Cria um novo token de configuração de senha no banco de dados.
 * Gera um registro que pode ser usado por um usuário para definir sua senha pela primeira vez.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param tokenData - Dados parciais do token contendo userId, tokenHash, setupCode e expiresAt
 * @returns O registro de token criado com ID gerado e timestamps
 */
export async function createPasswordSetupToken(client: Database, tokenData: Partial<PasswordSetupToken>) {
  const { rows } = await client.query(
    `INSERT INTO password_setup_tokens (user_id, token_hash, setup_code, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, setup_code, expires_at`,
    [
      tokenData.userId,
      tokenData.tokenHash,
      tokenData.setupCode,
      tokenData.expiresAt instanceof Date ? tokenData.expiresAt.toISOString() : tokenData.expiresAt
    ]
  );

  return rows[0];
}

/**
 * Busca um token de configuração aberto (não utilizado e não expirado).
 * Pesquisa pelo hash do token ou código de configuração, retornando a primeira correspondência válida.
 * Faz join com a tabela de usuários para retornar dados do usuário junto com dados do token.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param lookup - Objeto contendo tokenHash ou setupCode para buscar
 * @returns Dados combinados de token e usuário se encontrado e válido, null caso contrário
 */
export async function findOpenSetupToken(client: Database, lookup: { tokenHash?: string | null; setupCode?: string | null }) {
  const values: (string | null)[] = [];
  let whereClause: string;

  if (lookup.tokenHash) {
    values.push(lookup.tokenHash);
    whereClause = `pst.token_hash = $${values.length}`;
  } else if (lookup.setupCode) {
    values.push(lookup.setupCode);
    whereClause = `pst.setup_code = $${values.length}`;
  } else {
    return null;
  }

  const { rows } = await client.query(
    `SELECT
       pst.id AS setup_token_id,
       pst.user_id,
       pst.setup_code,
       pst.expires_at,
       u.id,
       u.name,
       u.email,
       u.role,
       u.phone,
       u.cpf,
       u.address,
       u.avatar,
       u.created_at
     FROM password_setup_tokens pst
     INNER JOIN users u ON u.id = pst.user_id
     WHERE ${whereClause}
       AND pst.consumed_at IS NULL
       AND pst.expires_at > NOW()
     LIMIT 1`,
    values
  );

  return rows[0] || null;
}

/**
 * Marca um token de configuração como consumido.
 * Define o timestamp consumed_at para evitar que o token seja reutilizado.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param tokenId - ID do token a ser marcado como consumido
 */
export async function consumeSetupToken(client: Database, tokenId: string) {
  await client.query(
    'UPDATE password_setup_tokens SET consumed_at = NOW() WHERE id = $1',
    [tokenId]
  );
}

/**
 * Exclui todos os tokens de configuração expirados ou já consumidos do banco de dados.
 * Deve ser executado periodicamente para limpar registros de token obsoletos.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function deleteExpiredSetupTokens(client: Database) {
  await client.query(
    'DELETE FROM password_setup_tokens WHERE consumed_at IS NOT NULL OR expires_at <= NOW()'
  );
}
