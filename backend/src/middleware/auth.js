import { getCookie } from 'hono/cookie';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../domain/constants.js';
import { resolveSession } from '../services/authService.js';
import { isSafeMethod, jsonError } from '../utils/http.js';

async function loadSession(c) {
  const db = c.get('db');
  if (!db) {
    return null;
  }

  const cached = c.get('resolvedSession');
  if (cached !== undefined) {
    return cached;
  }

  const client = await db.connect();
  try {
    return await resolveSession(c, client);
  } finally {
    client.release();
  }
}

export async function optionalAuthMiddleware(c, next) {
  await loadSession(c);
  await next();
}

export async function authMiddleware(c, next) {
  const session = await loadSession(c);
  if (!session?.user) {
    return jsonError(c, 401, 'Sessão inválida ou expirada');
  }

  await next();
}

export async function csrfMiddleware(c, next) {
  if (isSafeMethod(c.req.method)) {
    await next();
    return;
  }

  const session = c.get('session');
  if (!session?.id) {
    const hasSessionCookie = Boolean(getCookie(c, SESSION_COOKIE_NAME));
    if (!hasSessionCookie) {
      await next();
      return;
    }

    return jsonError(c, 401, 'Sessão inválida ou expirada');
  }

  const headerToken = c.req.header('x-csrf-token');
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);

  if (!headerToken || !cookieToken || headerToken !== cookieToken || headerToken !== session.csrfToken) {
    return jsonError(c, 403, 'Falha na verificação de segurança da sessão');
  }

  await next();
}

export async function adminOnly(c, next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return jsonError(c, 403, 'Acesso restrito ao administrador');
  }

  await next();
}
