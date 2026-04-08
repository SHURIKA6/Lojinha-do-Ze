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
  return c.json(data, status as 200 | 201);
}

export function applySecurityHeaders(c: Context): void {
  // SEC-15: script-src 'none' explícito — API não serve HTML/scripts
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    { append: false }
  );

  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  // SEC-14: geolocation=() — e-commerce não precisa de geolocalização
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');

  let isHttps = false;
  try {
    const requestUrl = new URL(c.req.url);
    isHttps = requestUrl.protocol === 'https:';
  } catch {
    // Fallback
  }

  if (isHttps) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
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
    return jsonError(c, 400, result.error?.issues[0]?.message || 'Validation error', result.error?.issues);
  }

  return undefined;
}