import { Context, Next, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../domain/constants';
import { isShuraRole, isStaffRole, type UserRole } from '../domain/roles';
import { resolveSession } from '../services/authService';
import { isSafeMethod, jsonError } from '../utils/http';
import { isAllowedOrigin } from './security';
import { Bindings, Variables } from '../types';
import { logger } from '../utils/logger';

async function loadSession(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  const db = c.get('db');
  if (!db) {
    return null;
  }

  const cached = c.get('resolvedSession');
  if (cached !== undefined) {
    return cached;
  }

  try {
    const client = await db.connect();
    try {
      return await resolveSession(c, client);
    } finally {
      if (client.release) client.release();
    }
  } catch (error) {
    logger.error('Erro ao carregar sessão do banco', error as Error);
    return null;
  }
}

export const optionalAuthMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  await loadSession(c);
  await next();
};

export const authMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const session = await loadSession(c);
  if (!session?.user) {
    return jsonError(c as any, 401, 'Sessão inválida ou expirada');
  }

  await next();
};

/**
 * Middleware CSRF usando double-submit cookie.
 */
export const csrfMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  if (isSafeMethod(c.req.method)) {
    await next();
    return;
  }

  const session = c.get('session');
  if (!session?.id) {
    const hasSessionCookie = Boolean(getCookie(c, SESSION_COOKIE_NAME));
    if (!hasSessionCookie) {
      // SEC-02: Defesa em profundidade — verificar Origin para mutações sem sessão
      const origin = c.req.header('origin');
      if (origin && !isAllowedOrigin(origin, c)) {
        return jsonError(c as any, 403, 'Origem não permitida');
      }
      await next();
      return;
    }

    return jsonError(c as any, 401, 'Sessão inválida ou expirada');
  }

  const headerToken = c.req.header('x-csrf-token');
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);

  if (!headerToken || !cookieToken || headerToken !== cookieToken || headerToken !== session.csrfToken) {
    return jsonError(c as any, 403, 'Falha na verificação de segurança da sessão');
  }

  await next();
};

export const adminOnly: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user || !isStaffRole(user.role)) {
    return jsonError(c as any, 403, 'Acesso restrito a administradores');
  }

  await next();
};

/**
 * Middleware para acesso exclusivo do proprietário (SHURA).
 */
export const shuraOnly: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user || !isShuraRole(user.role)) {
    return jsonError(c as any, 403, 'Acesso restrito ao proprietário do sistema');
  }

  await next();
};

/**
 * Middleware para verificar se o usuário possui um cargo (role) específico.
 */
export function hasRole(role: UserRole): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== role) {
      return jsonError(c as any, 403, `Acesso restrito a usuários com perfil ${role}`);
    }
    await next();
  };
}

/**
 * Middleware para verificar se o usuário possui qualquer um dos cargos (roles) especificados.
 */
export function hasAnyRole(roles: UserRole[]): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return jsonError(c as any, 403, 'Você não tem permissão para realizar esta ação');
    }
    await next();
  };
}
