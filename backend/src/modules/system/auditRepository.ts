import { Database } from '../../core/types';

export interface AuditEntry {
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(db: Database, entry: AuditEntry): Promise<void> {
  const query = `
    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id, details, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  
  await db.query(query, [
    entry.userId,
    entry.action,
    entry.entityType || null,
    entry.entityId || null,
    entry.details ? JSON.stringify(entry.details) : null,
    entry.ipAddress || null,
    entry.userAgent || null
  ]);
}

export async function getAuditLogs(db: Database, limit = 50, offset = 0) {
  const query = `
    SELECT 
      a.*, 
      u.name as user_name, 
      u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  
  const result = await db.query(query, [limit, offset]);
  return result.rows;
}
