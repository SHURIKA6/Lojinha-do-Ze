import { Context, Next, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../../core/domain/constants';
import { resolveSession } from '../modules/auth/service';
import { isSafeMethod, jsonError } from '../../core/utils/http';
import { isAllowedOrigin } from './security';
import { Bindings, Variables } from '../../core/types';

async function loadSession(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
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
    if (client.release) client.release();
  }
}

export const optionalAuthMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  await loadSession(c);
  return await next();
};

export const authMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const session = await loadSession(c);
  if (!session?.user) {
    return jsonError(c, 401, 'Sessão inválida ou expirada');
  }

  return await next();
};

/**
 * Middleware CSRF usando double-submit cookie.
 */
export const csrfMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  if (isSafeMethod(c.req.method)) {
    return await next();
  }

  const session = c.get('session');
  if (!session?.id) {
    const hasSessionCookie = Boolean(getCookie(c, SESSION_COOKIE_NAME));
    if (!hasSessionCookie) {
      // SEC-02: Defesa em profundidade — verificar Origin para mutações sem sessão
      const origin = c.req.header('origin');
      if (origin && !isAllowedOrigin(origin, c)) {
        return jsonError(c, 403, 'Origem não permitida');
      }
      return await next();
    }

    return jsonError(c, 401, 'Sessão inválida ou expirada');
  }

  const headerToken = c.req.header('x-csrf-token');
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);

  if (!headerToken || !cookieToken || headerToken !== cookieToken || headerToken !== session.csrfToken) {
    return jsonError(c, 403, 'Falha na verificação de segurança da sessão');
  }

  return await next();
};

export const adminOnly: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return jsonError(c, 403, 'Acesso restrito ao administrador');
  }

  return await next();
};

/**
 * Middleware para verificar se o usuário possui um cargo (role) específico.
 */
export function hasRole(role: string): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== role) {
      return jsonError(c, 403, `Acesso restrito a usuários com perfil ${role}`);
    }
    return await next();
  };
}

/**
 * Middleware para verificar se o usuário possui qualquer um dos cargos (roles) especificados.
 */
export function hasAnyRole(roles: string[]): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return jsonError(c, 403, 'Você não tem permissão para realizar esta ação');
    }
    return await next();
  };
}
