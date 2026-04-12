import { Context, Next, MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { applySecurityHeaders, isSafeMethod, jsonError } from '../utils/http';
import { Bindings } from '../types';

const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function normalizeOrigin(value: any): string | null {
  if (!value) return null;

  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

function splitCsv(value: any): string[] {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeHost(value: any): string | null {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const withoutPath = trimmed.split('/')[0];
  const host = withoutPath.replace(/^"|"$/g, '');
  return host || null;
}

function parseForwardedParams(forwardedHeader: any): Record<string, string> | null {
  if (!forwardedHeader) return null;

  const firstEntry = String(forwardedHeader).split(',')[0] || '';
  const parts = firstEntry.split(';').map((part) => part.trim()).filter(Boolean);
  const params: Record<string, string> = {};

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

function parseForwardedOrigin(forwardedHeader: any): string | null {
  const params = parseForwardedParams(forwardedHeader);
  if (!params) return null;

  const proto = params.proto;
  const host = params.host;
  if (!proto || !host) return null;

  return normalizeOrigin(`${proto}://${host}`);
}

function getForwardedHost(c: Context<any>): string | null {
  const params = parseForwardedParams(c.req.header('forwarded'));
  if (params?.host) {
    return normalizeHost(params.host);
  }

  return normalizeHost(
    (c.req.header('x-forwarded-host') || c.req.header('x-original-host') || '').split(',')[0]
  );
}

function getForwardedOrigin(c: Context<any>): string | null {
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

function getAllowedOriginConfig(c: Context<any>) {
  const allowedOrigins = new Set(LOCAL_ALLOWED_ORIGINS);
  const allowedHosts = new Set<string>();

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

export function isAllowedOrigin(origin: string | undefined, c: Context<any>): boolean {
  if (!origin) return false;

  const requestOrigin = new URL(c.req.url).origin;
  if (origin === requestOrigin) {
    return true;
  }

  // SEC: Só confiar em headers de forwarding se TRUST_PROXY estiver habilitado
  // Headers como x-forwarded-host são spoofáveis pelo cliente
  const trustProxy = c.env?.TRUST_PROXY === 'true';
  if (trustProxy) {
    const forwardedOrigin = getForwardedOrigin(c);
    if (forwardedOrigin && origin === forwardedOrigin) {
      return true;
    }

    const originHost = normalizeHost(origin.replace(/^[a-z]+:\/\//i, ''));
    const forwardedHost = getForwardedHost(c);
    if (forwardedHost && originHost && forwardedHost === originHost) {
      return true;
    }
  }

  const { allowedOrigins, allowedHosts } = getAllowedOriginConfig(c);
  if (allowedOrigins.has(origin)) {
    return true;
  }

  const originHost = normalizeHost(origin.replace(/^[a-z]+:\/\//i, ''));
  if (originHost && allowedHosts.has(originHost)) {
    return true;
  }

  return false;
}

export function createCorsMiddleware(): MiddlewareHandler {
  return cors({
    origin: (origin, c) => {
      if (!origin) return origin;

      return isAllowedOrigin(origin, c as Context<{ Bindings: Bindings }>) ? origin : '';
    },
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400,
  });
}

export const originGuardMiddleware: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  if (isSafeMethod(c.req.method)) {
    return await next();
  }

  const origin = c.req.header('origin');
  if (origin && !isAllowedOrigin(origin, c)) {
    const fetchSite = String(c.req.header('sec-fetch-site') || '').toLowerCase();
    if (fetchSite === 'same-origin' || fetchSite === 'same-site') {
      return await next();
    }

    return jsonError(c as any, 403, 'Origem não permitida');
  }

  return await next();
};

export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  const response = await next();
  applySecurityHeaders(c);
  return response;
};
