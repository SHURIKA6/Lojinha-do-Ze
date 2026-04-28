import { Context, Next } from 'hono';
import { logger, sanitizeObject } from '../utils/logger';
import { isSafeMethod } from '../utils/http';
import { createAuditLog } from '../../modules/system/auditRepository';

/**
 * Middleware para auditoria de segurança automatizada.
 * Registra todas as requisições não-seguras (POST, PUT, DELETE, etc.) 
 * e seus respectivos resultados.
 */
export async function auditMiddleware(c: Context, next: Next) {
  const method = c.req.method;
  const path = c.req.path;
  const startTime = Date.now();

  // Por padrão, registramos apenas métodos não-seguros para economia de performance/armazenamento,
  // mas você pode ajustar isso se todas as requisições precisarem de auditoria.
  const shouldAudit = !isSafeMethod(method);

  if (shouldAudit) {
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(7);
    
    // Registra a requisição recebida
    let bodyData: Record<string, unknown> = {};
    try {
      const contentType = c.req.header('content-type');
      if (contentType?.includes('application/json')) {
        // Clona a requisição bruta para evitar consumir o corpo original
        const cloned = c.req.raw.clone();
        const parsed = await cloned.json().catch(() => ({}));
        bodyData = parsed as Record<string, unknown>;
      } else if (contentType?.includes('multipart/form-data')) {
        bodyData = { type: 'form-data', info: 'Conteúdo oculto para economia de armazenamento no log de auditoria' };
      }
    } catch (e) {
      logger.warn(`Audit middleware body parse safe-fail`, { error: (e as Error).message });
    }

    try {
      const response = await next();

      const user = c.get('user');
      const db = c.get('db');
      const duration = Date.now() - startTime;
      const status = c.res.status;

      // Log no console para observabilidade
      logger.info(`Audit: ${method} ${path} - ${status}`, {
        requestId,
        method,
        path,
        user: user ? { id: user.id, email: user.email, role: user.role } : 'anonymous',
        body: sanitizeObject(bodyData),
        status,
        duration: `${duration}ms`,
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'hidden',
      });

      // Persistência em banco de dados para administradores
      if (db && user && user.role === 'admin' && status < 500) {
        // Usamos ctx.waitUntil se disponível para não atrasar a resposta
        const auditPromise = createAuditLog(db, {
          userId: user.id,
          action: `${method} ${path}`,
          entityType: path.split('/')[2] || 'unknown',
          entityId: path.split('/')[3] || null,
          details: {
            body: sanitizeObject(bodyData),
            status,
            duration: `${duration}ms`,
            requestId
          },
          ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
          userAgent: c.req.header('user-agent')
        }).catch(err => logger.error('Falha ao salvar log de auditoria', err));

        if (c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil(auditPromise);
        } else {
          await auditPromise;
        }
      }

      return response;
    } catch (error) {
      logger.error('Audit middleware: next() crashed', error as Error, { requestId });
      throw error;
    }
  } else {
    return await next();
  }
}