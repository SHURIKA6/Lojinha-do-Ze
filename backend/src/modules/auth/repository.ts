import { Database } from '../../core/types';

/**
 * Representa um registro de sessão armazenado no banco de dados.
 * Contém dados de sessão de autenticação incluindo associação de usuário, token CSRF e expiração.
 */
export interface SessionRecord {
  /** Identificador único da sessão */
  id: string;
  /** ID do usuário associado a esta sessão */
  userId: string;
  /** Token CSRF para proteção contra falsificação de solicitação cross-site (padrão double-submit cookie) */
  csrfToken: string;
  /** Data e hora em que esta sessão expira */
  expiresAt: Date;
  /** Endereço IP de onde a sessão foi criada (para auditoria/log) */
  ipAddress?: string | null;
  /** String do user agent de onde a sessão foi criada (para auditoria/log) */
  userAgent?: string | null;
  /** Hash SHA-256 do token de sessão (armazenado para consulta, nunca armazenar token bruto) */
  tokenHash: string;
}

/**
 * Cria um novo registro de sessão no banco de dados.
 * Armazena dados da sessão incluindo ID do usuário, hash do token, token CSRF e metadados.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param session - Registro parcial de sessão contendo dados da sessão para inserir
 * @returns O registro de sessão criado com ID gerado e timestamps
 */
export async function createSessionRecord(client: Database, session: Partial<SessionRecord>) {
  const { rows } = await client.query(
    `INSERT INTO auth_sessions (user_id, token_hash, csrf_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, csrf_token, expires_at`,
    [
      session.userId,
      session.tokenHash,
      session.csrfToken,
      session.ipAddress || null,
      session.userAgent || null,
      session.expiresAt instanceof Date ? session.expiresAt.toISOString() : session.expiresAt,
    ]
  );

  return rows[0];
}

/**
 * Busca uma sessão ativa pelo hash do token.
 * Realiza um inner join com a tabela de usuários para retornar dados da sessão e do usuário juntos.
 * Retorna apenas sessões que não expiraram (expires_at > NOW()).
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param tokenHash - Hash SHA-256 do token de sessão para buscar
 * @returns Dados combinados de sessão e usuário se encontrado e ativo, null caso contrário
 */
export async function findSessionByTokenHash(client: Database, tokenHash: string) {
  const { rows } = await client.query(
    `SELECT
       s.id AS session_id,
       s.user_id,
       s.csrf_token,
       s.expires_at,
       s.last_seen_at,
       u.id,
       u.name,
       u.email,
       u.role,
       u.phone,
       u.cpf,
       u.address,
       u.avatar,
       u.created_at
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

/**
 * Atualiza o timestamp last_seen_at de uma sessão.
 * Usado para rastrear atividade da sessão e implementar expiração deslizante da sessão.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param sessionId - ID da sessão a ser atualizada
 */
export async function touchSession(client: Database, sessionId: string) {
  await client.query(
    'UPDATE auth_sessions SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1',
    [sessionId]
  );
}

/**
 * Exclui uma sessão do banco de dados usando seu hash de token.
 * Usado durante logout ou ao invalidar uma sessão específica.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param tokenHash - Hash SHA-256 do token de sessão para excluir
 */
export async function deleteSessionByTokenHash(client: Database, tokenHash: string) {
  await client.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
}

/**
 * Exclui uma sessão do banco de dados usando seu ID.
 * Usado ao invalidar uma sessão pelo seu identificador no banco de dados.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param sessionId - ID da sessão a ser excluída
 */
export async function deleteSessionById(client: Database, sessionId: string) {
  await client.query('DELETE FROM auth_sessions WHERE id = $1', [sessionId]);
}

/**
 * Exclui todas as sessões expiradas do banco de dados.
 * Deve ser executado periodicamente para limpar registros de sessão obsoletos.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @returns Número de sessões excluídas
 */
export async function deleteExpiredSessions(client: Database) {
  const result = await client.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  return result.rowCount || 0;
}
