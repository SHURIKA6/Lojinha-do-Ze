import type { Context } from 'hono';
import { SAFE_HTTP_METHODS } from '../domain/constants';

export function isSafeMethod(method: string | undefined | null): boolean {
  return SAFE_HTTP_METHODS.has(String(method || '').toUpperCase());
}

export function jsonError(c: Context, status: number, error: string, details?: unknown) {
  const payload = details ? { error, details } : { error };
  return c.json(payload, status as 400 | 401 | 403 | 404 | 500);
}

export function jsonSuccess(c: Context, data: any, status: number = 200) {
  return c.json({ success: true, data }, status as 200 | 201);
}

export function applySecurityHeaders(c: Context): void {
  const headers = c.res.headers;

  if (!headers.has('Content-Security-Policy')) {
    headers.set(
      'Content-Security-Policy',
      // SEC-15: script-src 'none' explícito — API não serve HTML/scripts
      // Adicionado connect-src para permitir WebSockets (wss/ws)
      "default-src 'self'; script-src 'none'; connect-src 'self' https: wss: ws:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    );
  }

  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // SEC-14: geolocation=() — e-commerce não precisa de geolocalização
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  let isHttps = false;
  try {
    const requestUrl = new URL(c.req.url, 'http://localhost');
    isHttps = requestUrl.protocol === 'https:';
  } catch {
    // Fallback caso a análise da URL falhe
  }

  // SEC-13: Em Cloudflare Workers, c.req.url reflete o protocolo real do cliente.
  // O HSTS é setado apenas em HTTPS, o que é correto para este ambiente.
  if (isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

export function setNoStore(c: Context): void {
  c.header('Cache-Control', 'no-store');
}

interface ValidationResult {
  success: boolean;
  error?: {
    issues: Array<{ message: string }>;
  };
}

export function validationError(result: ValidationResult, c: Context) {
  if (!result.success) {
    return jsonError(c, 400, result.error?.issues[0]?.message || 'Validation error');
  }

  return undefined;
}