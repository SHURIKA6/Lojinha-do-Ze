import { Database } from '../types';

export interface SessionRecord {
  id: string;
  userId: string;
  csrfToken: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  tokenHash: string;
}

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

export async function touchSession(client: Database, sessionId: string) {
  await client.query(
    'UPDATE auth_sessions SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1',
    [sessionId]
  );
}

export async function deleteSessionByTokenHash(client: Database, tokenHash: string) {
  await client.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
}

export async function deleteSessionById(client: Database, sessionId: string) {
  await client.query('DELETE FROM auth_sessions WHERE id = $1', [sessionId]);
}

export async function deleteExpiredSessions(client: Database) {
  await client.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
}
