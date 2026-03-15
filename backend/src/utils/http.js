import { SAFE_HTTP_METHODS } from '../domain/constants.js';

export function isSafeMethod(method) {
  return SAFE_HTTP_METHODS.has(String(method || '').toUpperCase());
}

export function jsonError(c, status, error, details) {
  const payload = details ? { error, details } : { error };
  return c.json(payload, status);
}

export function applySecurityHeaders(c) {
  const headers = c.res.headers;

  if (!headers.has('Content-Security-Policy')) {
    headers.set(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    );
  }

  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  const requestUrl = new URL(c.req.url);
  if (requestUrl.protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

export function setNoStore(c) {
  c.res.headers.set('Cache-Control', 'no-store');
}

export function validationError(result, c) {
  if (!result.success) {
    return jsonError(c, 400, result.error.issues[0].message);
  }

  return undefined;
}
