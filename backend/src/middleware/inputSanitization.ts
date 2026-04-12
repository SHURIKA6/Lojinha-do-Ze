/**
 * Middleware de Sanitização de Inputs contra XSS
 * Protege contra ataques de script injection
 */

import { Context, Next } from 'hono';
import { logger } from '../utils/logger.js';

/**
 * Caracteres perigosos que precisam ser escapados
 */
const DANGEROUS_CHARS: Record<string, string> = {
  '<': '<',
  '>': '>',
  '"': '"',
  "'": '&#x27;',
  '/': '&#x2F;',
  '&': '&',
};

/**
 * Padrões de XSS conhecidos
 */
const XSS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /expression\s*\(/gi,
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  /livescript:/gi,
  /mocha:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /<input/gi,
  /<textarea/gi,
  /<select/gi,
  /<button/gi,
  /<link/gi,
  /<meta/gi,
  /<style/gi,
  /<base/gi,
  /<bgsound/gi,
  /<marquee/gi,
  /<applet/gi,
  /<xml/gi,
  /<blink/gi,
  /<spacer/gi,
  /<layer/gi,
];

/**
 * Sanitiza uma string contra XSS
 */
export function sanitizeString(value: string): string {
  return sanitizeValue(value) as string;
}

/**
 * Sanitiza um valor individual
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove padrões de XSS conhecidos
    let sanitized = value;
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Escapa caracteres perigosos
    Object.entries(DANGEROUS_CHARS).forEach(([char, replacement]) => {
      sanitized = sanitized.replace(new RegExp(char, 'g'), replacement);
    });

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

/**
 * Sanitiza um objeto inteiro
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(obj).forEach(([key, value]) => {
    sanitized[key] = sanitizeValue(value);
  });

  return sanitized;
}

/**
 * Sanitiza requisições POST, PUT, PATCH
 */
async function sanitizeRequest(c: Context): Promise<void> {
  const method = c.req.method;
  const contentType = c.req.header('content-type');

  // Apenas sanitiza métodos que modificam dados
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return;
  }

  // Apenas sanitiza conteúdo JSON
  if (!contentType?.includes('application/json')) {
    return;
  }

  try {
    // Clona a requisição para evitar consumir o corpo original
    const cloned = c.req.raw.clone();
    const body = await cloned.json().catch(() => ({}));
    const sanitizedBody = sanitizeObject(body as Record<string, unknown>);

    // Substitui o corpo da requisição com os dados sanitizados
    (c.req as any).raw = new Request(JSON.stringify(sanitizedBody));
  } catch (error) {
    logger.warn('Erro na sanitização de input', { error: (error as Error).message });
  }
}

/**
 * Middleware de sanitização de inputs
 */
export function inputSanitizationMiddleware(c: Context, next: Next) {
  sanitizeRequest(c);
  next();
}

/**
 * Middleware de sanitização para requisições específicas
 */
export function sanitizeSpecificRequest(fields: string[]) {
  return async (c: Context, next: Next) => {
    const contentType = c.req.header('content-type');

    if (!contentType?.includes('application/json')) {
      await next();
      return;
    }

    try {
      const cloned = c.req.raw.clone();
      const body = await cloned.json().catch(() => ({}));
      const sanitizedBody: Record<string, unknown> = {};

      Object.entries(body as Record<string, unknown>).forEach(([key, value]) => {
        if (fields.includes(key)) {
          sanitizedBody[key] = sanitizeValue(value);
        } else {
          sanitizedBody[key] = value;
        }
      });

      (c.req as any).raw = new Request(JSON.stringify(sanitizedBody));
    } catch (error) {
      logger.warn('Erro na sanitização específica', { error: (error as Error).message });
    }

    await next();
  };
}

/**
 * Middleware para sanitizar parâmetros de URL
 */
export function sanitizeQueryParams() {
  return async (c: Context, next: Next) => {
    const query = c.req.query();
    const sanitizedQuery: Record<string, string | string[]> = {};

    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        sanitizedQuery[key] = value.map(sanitizeValue) as string[];
      } else {
        sanitizedQuery[key] = sanitizeValue(value) as string;
      }
    });

    (c.req as any).query = sanitizedQuery;
    await next();
  };
}

/**
 * Middleware para sanitizar cabeçalhos
 */
export function sanitizeHeaders() {
  return async (c: Context, next: Next) => {
    const sanitizedHeaders: Record<string, string> = {};

    c.req.raw.headers.forEach((value, key) => {
      sanitizedHeaders[key] = sanitizeValue(value) as string;
    });

    await next();
  };
}

/**
 * Middleware para sanitizar respostas
 */
export function sanitizeResponse() {
  return async (c: Context, next: Next) => {
    await next();

    try {
      const responseBody = await c.res.text();
      const sanitizedResponse = sanitizeValue(responseBody);

      c.res = new Response(JSON.stringify(sanitizedResponse), {
        status: c.res.status,
        headers: c.res.headers,
      });
    } catch (error) {
      logger.warn('Erro na sanitização de resposta', { error: (error as Error).message });
    }
  };
}