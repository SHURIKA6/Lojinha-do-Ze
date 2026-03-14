import { cors } from 'hono/cors';
import { applySecurityHeaders, isSafeMethod, jsonError } from '../utils/http.js';

const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function getAllowedOrigins(c) {
  const configured = String(c.env?.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...LOCAL_ALLOWED_ORIGINS, ...configured]);
}

export function isAllowedOrigin(origin, c) {
  if (!origin) return false;

  const requestOrigin = new URL(c.req.url).origin;
  if (origin === requestOrigin) {
    return true;
  }

  return getAllowedOrigins(c).has(origin);
}

export function createCorsMiddleware() {
  return cors({
    origin: (origin, c) => {
      if (!origin) return origin;

      return isAllowedOrigin(origin, c) ? origin : '';
    },
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400,
  });
}

export async function originGuardMiddleware(c, next) {
  if (isSafeMethod(c.req.method)) {
    await next();
    return;
  }

  const origin = c.req.header('origin');
  if (origin && !isAllowedOrigin(origin, c)) {
    return jsonError(c, 403, 'Origem não permitida');
  }

  await next();
}

export async function securityHeadersMiddleware(c, next) {
  await next();
  applySecurityHeaders(c);
}
