import { Database } from '../../core/types';

export interface PasswordSetupToken {
  id: string;
  userId: string;
  tokenHash: string;
  setupCode: string;
  expiresAt: Date;
  consumedAt?: Date | null;
}

export async function revokeOpenSetupTokensForUser(client: Database, userId: string) {
  await client.query(
    `UPDATE password_setup_tokens
     SET consumed_at = COALESCE(consumed_at, NOW())
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId]
  );
}

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

export async function consumeSetupToken(client: Database, tokenId: string) {
  await client.query(
    'UPDATE password_setup_tokens SET consumed_at = NOW() WHERE id = $1',
    [tokenId]
  );
}

export async function deleteExpiredSetupTokens(client: Database) {
  await client.query(
    'DELETE FROM password_setup_tokens WHERE consumed_at IS NOT NULL OR expires_at <= NOW()'
  );
}
