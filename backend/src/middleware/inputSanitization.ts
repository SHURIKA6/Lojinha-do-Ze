/**
 * Middleware de Sanitização de Inputs contra XSS
 * Protege contra ataques de script injection
 */

import { Context, Next } from 'hono';
import { logger } from '../utils/logger';

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
 * Sanitiza um valor individual
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove padrões de XSS conhecidos
    let sanitized = value;
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Escapa caracteres perigosos de forma robusta
    // Usamos um mapa de escape para evitar múltiplas iterações se possível, 
    // mas para compatibilidade mantemos a lógica clara.
    for (const [char, replacement] of Object.entries(DANGEROUS_CHARS)) {
      // Escapa o caractere para uso em RegExp se necessário
      const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(escapedChar, 'g'), replacement);
    }
    
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

    // Substitui o corpo da requisição com os dados sanitizados preservando headers e configurações
    (c.req as any).raw = new Request(c.req.raw, {
      body: JSON.stringify(sanitizedBody)
    });
  } catch (error) {
    logger.warn('Erro na sanitização de input', { error: (error as Error).message });
  }
}

/**
 * Middleware de sanitização de inputs
 */
export async function inputSanitizationMiddleware(c: Context, next: Next) {
  // Apenas chamamos se houver um corpo passível de JSON
  const contentType = c.req.header('content-type');
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method) && contentType?.includes('application/json')) {
    await sanitizeRequest(c);
  }
  await next();
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

      // Substitui o corpo preservando metadados da requisição
      (c.req as any).raw = new Request(c.req.raw, {
        body: JSON.stringify(sanitizedBody)
      });
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
    // Sanitiza apenas os cabeçalhos de entrada (opcionalmente)
    const headers = c.req.header();
    const sanitizedHeaders: Record<string, string> = {};

    Object.entries(headers).forEach(([key, value]) => {
      sanitizedHeaders[key] = sanitizeValue(value) as string;
    });

    // Injetar headers sanitizados se necessário
    // Em Hono, alterar headers da requisição original é desencorajado
    // mas se precisarmos acessar depois via c.req.header() usamos essa cópia
    
    await next();
  };
}

/**
 * Middleware para sanitizar respostas (XSS Prevention on Output)
 * IMPORTANTE: Corrige o bug de corromper JSON reportado na auditoria
 */
export function sanitizeResponse() {
  return async (c: Context, next: Next) => {
    await next();

    // Se a resposta estiver vazia ou não for do tipo texto/json, ignoramos
    if (!c.res || !c.res.body) return;

    const contentType = c.res.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        // Clonamos para ler e substituir
        const originalRes = c.res.clone();
        const body = await originalRes.json();
        
        // Sanitiza o objeto JSON de forma recursiva
        const sanitizedBody = sanitizeValue(body);
        
        // Substitui a resposta
        c.res = c.json(sanitizedBody, c.res.status as any);
      } else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
        const originalRes = c.res.clone();
        const body = await originalRes.text();
        const sanitizedBody = sanitizeValue(body) as string;
        
        c.res = new Response(sanitizedBody, {
          status: c.res.status,
          headers: c.res.headers,
        });
      }
    } catch (error) {
      logger.warn('Erro na sanitização de resposta', { error: (error as Error).message });
    }
  };
}

/**
 * Alias para sanitização de strings para compatibilidade com middleware de validação
 */
export function sanitizeString(value: string): string {
  return sanitizeValue(value) as string;
}