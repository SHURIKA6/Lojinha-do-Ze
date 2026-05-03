import { Context, Next, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../domain/constants';
import { resolveSession } from '../../modules/auth/service';
import { isSafeMethod, jsonError } from '../utils/http';
import { isAllowedOrigin } from './security';
import { Bindings, Variables } from '../types';

/**
 * Resolve a sessão atual a partir do contexto da requisição.
 * Utiliza um mecanismo de cache para evitar resolver a sessão múltiplas vezes por requisição.
 * Primeiro verifica se uma sessão já foi resolvida e cacheada no contexto.
 * Se não estiver em cache, recupera o token de sessão do cookie e resolve a sessão usando o banco de dados.
 * Utiliza o driver HTTP diretamente (em vez de Pool/WebSocket) para evitar crashes de isolate no Cloudflare Workers.
 *
 * @param c - O contexto do Hono contendo bindings e variáveis
 * @returns O objeto de sessão resolvido, ou null se não houver sessão válida
 */
async function loadSession(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  const db = c.get('db');
  if (!db) {
    return null;
  }

  const cached = c.get('resolvedSession');
  if (cached !== undefined) {
    return cached;
  }

  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    // @ts-ignore
    c.set('resolvedSession', null);
    return null;
  }

  // PERF: Usa db diretamente (HTTP driver) em vez de db.connect() (Pool/WebSocket)
  // para evitar crash do isolate no Cloudflare Workers
  return await resolveSession(c, db);
}

/**
 * Middleware que tenta carregar a sessão do usuário, mas não exige autenticação.
 * Útil para endpoints que funcionam tanto para usuários autenticados quanto não autenticados.
 * Se uma sessão válida existir, ela será carregada no contexto; caso contrário, a requisição continua sem sessão.
 *
 * @param c - O contexto do Hono contendo bindings e variáveis
 * @param next - A próxima função de middleware na cadeia
 */
export const optionalAuthMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  await loadSession(c);
  return await next();
};

/**
 * Middleware que exige autenticação para acessar endpoints protegidos.
 * Carrega a sessão do usuário e retorna um erro 401 se a sessão for inválida ou expirada.
 * Deve ser usado em rotas que exigem que o usuário esteja logado.
 *
 * @param c - O contexto do Hono contendo bindings e variáveis
 * @param next - A próxima função de middleware na cadeia
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const session = await loadSession(c);
  if (!session?.user) {
    return jsonError(c, 401, 'Sessão inválida ou expirada');
  }

  return await next();
};

/**
 * Middleware para proteção CSRF utilizando o padrão double-submit cookie.
 * Para métodos seguros (GET, HEAD, OPTIONS), a requisição passa sem verificação.
 * Para métodos inseguros (POST, PUT, DELETE, etc.):
 *   - Se não houver sessão mas houver um cookie de sessão presente, retorna 401 (sessão inválida/expirada)
 *   - Se não houver sessão e nem cookie de sessão, verifica o cabeçalho Origin como defesa em profundidade
 *   - Se houver sessão, valida se o cabeçalho x-csrf-token corresponde tanto ao cookie CSRF quanto ao token CSRF da sessão
 *
 * @param c - O contexto do Hono contendo bindings e variáveis
 * @param next - A próxima função de middleware na cadeia
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

/**
 * Middleware que restringe acesso apenas a usuários administradores.
 * Verifica se o usuário autenticado possui o perfil 'admin'.
 * Retorna um erro 403 se o usuário não estiver autenticado ou não tiver privilégios de administrador.
 *
 * @param c - O contexto do Hono contendo bindings e variáveis
 * @param next - A próxima função de middleware na cadeia
 */
export const adminOnly: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return jsonError(c, 403, 'Acesso restrito ao administrador');
  }

  return await next();
};

/**
 * Cria um middleware que verifica se o usuário autenticado possui um perfil específico.
 * Retorna um erro 403 se o usuário não estiver autenticado ou não tiver o perfil necessário.
 *
 * @param role - O perfil que o usuário deve ter para acessar a rota
 * @returns Uma função de middleware que realiza controle de acesso baseado em perfil
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
 * Cria um middleware que verifica se o usuário autenticado possui qualquer um dos perfis especificados.
 * Retorna um erro 403 se o usuário não estiver autenticado ou não tiver nenhum dos perfis permitidos.
 *
 * @param roles - Array de perfis que têm permissão para acessar a rota
 * @returns Uma função de middleware que realiza controle de acesso baseado em perfil para múltiplos perfis
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
