import { Context, Next } from 'hono';
import { logger, sanitizeObject } from '../utils/logger.js';
import { isSafeMethod } from '../utils/http.js';

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
    const user = c.get('user');
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

    logger.info(`Audit Request: ${method} ${path}`, {
      requestId,
      method,
      path,
      user: user ? { id: user.id, email: user.email, role: user.role } : 'anonymous',
      body: sanitizeObject(bodyData),
      ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'hidden',
    });

    try {
      await next();
    } catch (error) {
      logger.error('Audit middleware: next() crashed', error as Error, { requestId });
      throw error;
    }

    const duration = Date.now() - startTime;
    const status = c.res.status;

    logger.info(`Audit Response: ${method} ${path} - ${status}`, {
      requestId,
      status,
      duration: `${duration}ms`,
    });
  } else {
    await next();
  }
}