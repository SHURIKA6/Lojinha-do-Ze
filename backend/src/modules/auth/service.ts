import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  CSRF_COOKIE_NAME,
  PASSWORD_SETUP_CODE_LENGTH,
  PASSWORD_SETUP_TTL_HOURS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '../../core/domain/constants';
import { randomCode, randomToken, sha256Hex, verifyPassword } from '../../core/utils/crypto';

import { logger } from '../../core/utils/logger';
import {
  createSessionRecord,
  deleteExpiredSessions,
  deleteSessionById,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  touchSession,
} from './repository';
import { cacheService } from '../../modules/system/cacheService';
import * as userRepository from '../customers/userRepository';
import {
  consumeSetupToken,
  createPasswordSetupToken,
  deleteExpiredSetupTokens,
  findOpenSetupToken,
  revokeOpenSetupTokensForUser,
} from './passwordSetupRepository';
import { Bindings, User, Variables, Database, UserDB } from '../../core/types';

type AppEnv = { Bindings: Bindings; Variables: Variables };

type ResolvedSession = {
  id: string;
  userId: string;
  csrfToken: string;
  expiresAt: Date;
  user: User;
};

function isResolvedSessionUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.role === 'string';
}

function normalizeResolvedSession(value: unknown): ResolvedSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const expiresAtValue = candidate.expiresAt;
  const expiresAt = expiresAtValue instanceof Date
    ? expiresAtValue
    : typeof expiresAtValue === 'string' || typeof expiresAtValue === 'number'
      ? new Date(expiresAtValue)
      : null;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.userId !== 'string' ||
    typeof candidate.csrfToken !== 'string' ||
    !isResolvedSessionUser(candidate.user) ||
    !expiresAt ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return null;
  }

  return {
    id: candidate.id,
    userId: candidate.userId,
    csrfToken: candidate.csrfToken,
    expiresAt,
    user: candidate.user,
  };
}

function buildResolvedSession(row: Record<string, any>, user?: User): ResolvedSession {
  const expiresAtValue = row.expires_at ?? row.expiresAt;

  return {
    id: row.session_id ?? row.id,
    userId: row.user_id ?? row.userId ?? user?.id,
    csrfToken: row.csrf_token ?? row.csrfToken,
    expiresAt: expiresAtValue instanceof Date ? expiresAtValue : new Date(expiresAtValue),
    user: user ?? serializeUser(row as UserDB),
  };
}

function storeResolvedSession(c: Context<AppEnv>, session: ResolvedSession | null) {
  // @ts-ignore
  c.set('resolvedSession', session);
  // @ts-ignore
  c.set('session', session);
  // @ts-ignore
  c.set('user', session?.user ?? null);
}

function isSecureRequest(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

/**
 * SEC-04: sameSite: 'Strict' impede envio do cookie em qualquer navegação cross-site.
 * SEC-11: O cookie CSRF usa httpOnly: false intencionalmente (double-submit cookie pattern).
 *         A proteção primária contra XSS roubar o CSRF token é o CSP + origin guard.
 */
function sessionCookieOptions(c: Context<AppEnv>, maxAge = SESSION_TTL_SECONDS, httpOnly = true) {
  const isProd = c.env?.ENVIRONMENT === 'production';
  return {
    path: '/',
    sameSite: 'Strict' as const,
    secure: isProd || isSecureRequest(c),
    httpOnly,
    maxAge,
  };
}

function serializeUser(row: UserDB): User {
  let address = undefined;
  
  if (row.address) {
    try {
      address = JSON.parse(row.address);
    } catch (parseError) {
      logger.warn('Falha ao parsear endereço do usuário (JSON inválido)', { 
        userId: row.id,
        addressValue: row.address
      });
      address = undefined;
    }
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as 'admin' | 'customer',
    phone: row.phone || undefined,
    cpf: row.cpf,
    address,
    avatar: row.avatar || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at || row.created_at),
  };
}


export async function authenticate(db: Database, identifier: string, password: string) {
  const loginValue = identifier.trim().toLowerCase();
  
  // Tenta buscar por e-mail ou CPF (se identifier tiver formato de CPF)
  let user = await userRepository.findByEmail(db, loginValue);
  
  if (!user && loginValue.length >= 11) {
    user = await userRepository.findByCpf(db, loginValue);
  }

  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  let validPassword = false;
  
  try {
    if (user.password) {
      // Detecta hash BCrypt legado, SHA1, MD5 etc
      if (user.password.startsWith('$2') || user.password.startsWith('$2a') || 
          user.password.startsWith('$2b') || user.password.startsWith('$argon')) {
        logger.warn('Usuário com hash de senha legado. Necessita reset de senha', { 
          userId: user.id,
          email: user.email,
          hashType: user.password.substring(0, 4)
        });
        
        // Para hash não suportado, retorna credenciais inválidas
        // Mas não quebra o fluxo com erro 500
        validPassword = false;
      } else {
        validPassword = await verifyPassword(password, user.password);
      }
    } else {
      validPassword = false;
    }
  } catch (verifyError: unknown) {
    logger.error('Exceção durante verificação de senha', { 
      userId: user.id,
      email: user.email,
      errorMessage: verifyError instanceof Error ? verifyError.message : String(verifyError),
      errorStack: verifyError instanceof Error ? verifyError.stack : undefined
    });
    validPassword = false;
  }
  
  if (!validPassword) {
    throw new Error('Credenciais inválidas');
  }

  return user;
}


export async function issueSession(c: Context<AppEnv>, client: Database, user: User | UserDB) {
  const resolvedUser = 'createdAt' in user ? user : serializeUser(user);
  const sessionToken = randomToken(32);
  const csrfToken = randomToken(24);
  const tokenHash = await sha256Hex(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const createdSession = await createSessionRecord(client, {
    userId: resolvedUser.id,
    tokenHash,
    csrfToken,
    expiresAt,
    ipAddress: c.req.header('cf-connecting-ip') || null,
    userAgent: c.req.header('user-agent') || null,
  });

  const session = buildResolvedSession(createdSession, resolvedUser);

  // PERF: Alimenta o cache imediatamente para acelerar a próxima requisição
  cacheService.setSession(tokenHash, session);

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(c));
  setCookie(c, CSRF_COOKIE_NAME, csrfToken, sessionCookieOptions(c, SESSION_TTL_SECONDS, false));

  return { csrfToken };
}

export function clearSessionCookies(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  deleteCookie(c, CSRF_COOKIE_NAME, { path: '/' });
}

export async function destroySession(c: Context<AppEnv>, client: Database) {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionToken) {
    const tokenHash = await sha256Hex(sessionToken);
    await deleteSessionByTokenHash(client, tokenHash);
    cacheService.deleteSession(tokenHash);
  }

  clearSessionCookies(c);
}

export async function resolveSession(c: Context<AppEnv>, client: Database) {
  // @ts-ignore - resolveSession behavior with Hono Context
  const cached = c.get('resolvedSession');
  if (cached !== undefined) {
    return cached;
  }

  // PERF-05: Limpeza probabilística — executa apenas ~1% das vezes
  if (Math.random() < 0.01) {
    await deleteExpiredSessions(client);
  }

  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    // @ts-ignore
    c.set('resolvedSession', null);
    return null;
  }

  const tokenHash = await sha256Hex(sessionToken);

  // PERF: Tenta obter do cache antes de consultar o banco
  const fromCache = cacheService.getSession(tokenHash);
  if (fromCache) {
    const session = normalizeResolvedSession(fromCache);
    if (session) {
      storeResolvedSession(c, session);
      return session;
    }

    logger.warn('Entrada inválida no cache de sessão ignorada; consultando banco', {
      tokenHashPrefix: tokenHash.slice(0, 8),
    });
    cacheService.deleteSession(tokenHash);
  }

  const row = await findSessionByTokenHash(client, tokenHash);
  if (!row) {
    clearSessionCookies(c);
    storeResolvedSession(c, null);
    return null;
  }

  const session = buildResolvedSession(row);

  // Alimenta o cache para as próximas chamadas
  cacheService.setSession(tokenHash, session);

  storeResolvedSession(c, session);

  try {
    await touchSession(client, session.id);
  } catch (error) {
    logger.error('Erro ao atualizar sessão (touch)', error);
  }

  return session;
}

export async function invalidateResolvedSession(c: Context<AppEnv>, client: Database) {
  // @ts-ignore
  const session = c.get('session');
  if (session?.id) {
    await deleteSessionById(client, session.id);
  }

  storeResolvedSession(c, null);
  clearSessionCookies(c);
}

export async function generatePasswordSetupInvite(c: Context<AppEnv>, client: Database, user: User) {
  await deleteExpiredSetupTokens(client);
  await revokeOpenSetupTokensForUser(client, user.id);

  const rawToken = randomToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const setupCode = randomCode(PASSWORD_SETUP_CODE_LENGTH);
  const expiresAt = new Date(Date.now() + PASSWORD_SETUP_TTL_HOURS * 60 * 60 * 1000);

  const tokenRecord = await createPasswordSetupToken(client, {
    userId: user.id,
    tokenHash,
    setupCode,
    expiresAt,
  });

  const baseUrl = c.env?.FRONTEND_URL || new URL(c.req.url).origin;
  const setupUrl = `${baseUrl.replace(/\/$/, '')}/ativar-conta?token=${rawToken}`;

  return {
    setupUrl,
    setupCode: tokenRecord.setup_code,
    expiresAt: tokenRecord.expires_at,
  };
}

export async function consumePasswordSetupInvite(client: Database, lookup: { token?: string; code?: string }) {
  await deleteExpiredSetupTokens(client);

  const tokenHash = lookup.token ? await sha256Hex(lookup.token) : null;
  const invite = await findOpenSetupToken(client, {
    tokenHash,
    setupCode: lookup.code,
  });

  if (!invite) {
    return null;
  }

  await consumeSetupToken(client, invite.setup_token_id);
  await revokeOpenSetupTokensForUser(client, invite.id);

  return {
    inviteId: invite.setup_token_id,
    user: serializeUser(invite),
  };
}
