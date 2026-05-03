import { Database } from '../../core/types';

/**
 * Interface que define a estrutura de uma entrada de log de auditoria.
 * Registra ações realizadas por usuários no sistema para fins de rastreabilidade.
 */
export interface AuditEntry {
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Cria um novo registro de log de auditoria no banco de dados.
 * Persiste informações sobre ações realizadas por usuários no sistema.
 * 
 * @param db - Instância do banco de dados para inserção
 * @param entry - Objeto contendo os dados do log de auditoria
 * @param entry.userId - ID do usuário que realizou a ação (null para ações do sistema)
 * @param entry.action - Descrição da ação realizada
 * @param entry.entityType - Tipo da entidade afetada (opcional)
 * @param entry.entityId - ID da entidade afetada (opcional)
 * @param entry.details - Detalhes adicionais da ação em formato JSON (opcional)
 * @param entry.ipAddress - Endereço IP do usuário (opcional)
 * @param entry.userAgent - User-Agent do navegador do usuário (opcional)
 * @returns Promise que resolve quando o log é criado
 */
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

/**
 * Recupera logs de auditoria do banco de dados com paginação.
 * Retorna logs ordenados por data decrescente, incluindo informações do usuário (nome e email).
 * 
 * @param db - Instância do banco de dados para consulta
 * @param limit - Número máximo de registros a retornar (padrão: 50)
 * @param offset - Número de registros para pular (padrão: 0)
 * @returns Array de objetos de log de auditoria com dados do usuário
 */
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
