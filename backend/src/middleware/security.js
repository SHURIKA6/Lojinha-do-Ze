import { cors } from 'hono/cors';
import { applySecurityHeaders, isSafeMethod, jsonError } from '../utils/http.js';

const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function normalizeOrigin(value) {
  if (!value) return null;

  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeHost(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const withoutPath = trimmed.split('/')[0];
  const host = withoutPath.replace(/^"|"$/g, '');
  return host || null;
}

function parseForwardedParams(forwardedHeader) {
  if (!forwardedHeader) return null;

  const firstEntry = String(forwardedHeader).split(',')[0] || '';
  const parts = firstEntry.split(';').map((part) => part.trim()).filter(Boolean);
  const params = {};

  for (const part of parts) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim().toLowerCase();
    const rawValue = part.slice(index + 1).trim();
    const value = rawValue.replace(/^"|"$/g, '');
    if (key && value) {
      params[key] = value;
    }
  }

  return params;
}

function parseForwardedOrigin(forwardedHeader) {
  const params = parseForwardedParams(forwardedHeader);
  if (!params) return null;

  const proto = params.proto;
  const host = params.host;
  if (!proto || !host) return null;

  return normalizeOrigin(`${proto}://${host}`);
}

function getForwardedHost(c) {
  const params = parseForwardedParams(c.req.header('forwarded'));
  if (params?.host) {
    return normalizeHost(params.host);
  }

  return normalizeHost(
    (c.req.header('x-forwarded-host') || c.req.header('x-original-host') || '').split(',')[0]
  );
}

function getForwardedOrigin(c) {
  const forwardedOrigin = parseForwardedOrigin(c.req.header('forwarded'));
  if (forwardedOrigin) return forwardedOrigin;

  const proto = (c.req.header('x-forwarded-proto') || c.req.header('x-original-proto') || '')
    .split(',')[0]
    ?.trim();
  const host = normalizeHost(
    (c.req.header('x-forwarded-host') || c.req.header('x-original-host') || '').split(',')[0]
  );

  if (!proto || !host) return null;

  return normalizeOrigin(`${proto}://${host}`);
}

function getAllowedOriginConfig(c) {
  const allowedOrigins = new Set(LOCAL_ALLOWED_ORIGINS);
  const allowedHosts = new Set();

  const configured = splitCsv(c.env?.ALLOWED_ORIGINS);
  for (const entry of configured) {
    const normalized = normalizeOrigin(entry);
    if (normalized) {
      allowedOrigins.add(normalized);
      allowedHosts.add(new URL(normalized).host);
      continue;
    }

    const host = normalizeHost(entry);
    if (host) {
      allowedHosts.add(host);
    }
  }

  const frontendOrigin = normalizeOrigin(c.env?.FRONTEND_URL);
  if (frontendOrigin) {
    allowedOrigins.add(frontendOrigin);
    allowedHosts.add(new URL(frontendOrigin).host);
  }

  return { allowedOrigins, allowedHosts };
}

export function isAllowedOrigin(origin, c) {
  if (!origin) return false;

  const requestOrigin = new URL(c.req.url).origin;
  if (origin === requestOrigin) {
    return true;
  }

  const forwardedOrigin = getForwardedOrigin(c);
  if (forwardedOrigin && origin === forwardedOrigin) {
    return true;
  }

  const originHost = normalizeHost(origin.replace(/^[a-z]+:\/\//i, ''));
  const forwardedHost = getForwardedHost(c);
  if (forwardedHost && originHost && forwardedHost === originHost) {
    return true;
  }

  const { allowedOrigins, allowedHosts } = getAllowedOriginConfig(c);
  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (originHost && allowedHosts.has(originHost)) {
    return true;
  }

  return false;
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
    const fetchSite = String(c.req.header('sec-fetch-site') || '').toLowerCase();
    if (fetchSite === 'same-origin' || fetchSite === 'same-site') {
      await next();
      return;
    }

    return jsonError(c, 403, 'Origem não permitida');
  }

  await next();
}

export async function securityHeadersMiddleware(c, next) {
  await next();
  applySecurityHeaders(c);
}
