import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  CSRF_COOKIE_NAME,
  PASSWORD_SETUP_CODE_LENGTH,
  PASSWORD_SETUP_TTL_HOURS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '../domain/constants';
import { randomCode, randomToken, sha256Hex, verifyPassword } from '../utils/crypto';

import { logger } from '../utils/logger';
import {
  createSessionRecord,
  deleteExpiredSessions,
  deleteSessionById,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  touchSession,
  SessionRecord,
} from '../repositories/sessionRepository';
import * as userRepository from '../repositories/userRepository';
import {
  consumeSetupToken,
  createPasswordSetupToken,
  deleteExpiredSetupTokens,
  findOpenSetupToken,
  revokeOpenSetupTokensForUser,
} from '../repositories/passwordSetupRepository';
import { Bindings, User, Variables, Database, UserDB, HonoCloudflareContext } from '../types';

type AppEnv = { Bindings: Bindings; Variables: Variables };


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
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as 'admin' | 'customer',
    phone: row.phone || undefined,
    cpf: row.cpf,
    address: row.address ? JSON.parse(row.address) : undefined,
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

  const validPassword = user.password ? await verifyPassword(password, user.password) : false;
  if (!validPassword) {
    throw new Error('Credenciais inválidas');
  }

  return user;
}


export async function issueSession(c: Context<AppEnv>, client: Database, userId: string) {
  const sessionToken = randomToken(32);
  const csrfToken = randomToken(24);
  const tokenHash = await sha256Hex(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await createSessionRecord(client, {
    userId,
    tokenHash,
    csrfToken,
    expiresAt,
    ipAddress: c.req.header('cf-connecting-ip') || null,
    userAgent: c.req.header('user-agent') || null,
  });

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
  const row = await findSessionByTokenHash(client, tokenHash);
  if (!row) {
    clearSessionCookies(c);
    // @ts-ignore
    c.set('resolvedSession', null);
    return null;
  }

  const session = {
    id: row.session_id,
    userId: row.user_id,
    csrfToken: row.csrf_token,
    expiresAt: row.expires_at,
    user: serializeUser(row),
  };

  // @ts-ignore
  c.set('resolvedSession', session);
  // @ts-ignore
  c.set('user', session.user);
  // @ts-ignore
  c.set('session', session);

  const touchPromise = touchSession(client, session.id).catch((error) => {
    logger.error('Erro ao atualizar sessão (touch)', error);
  });

  const executionCtx = (c as any).executionCtx;
  if (executionCtx && typeof executionCtx.waitUntil === 'function') {
    executionCtx.waitUntil(touchPromise);
  } else {
    await touchPromise;
  }


  return session;
}

export async function invalidateResolvedSession(c: Context<AppEnv>, client: Database) {
  // @ts-ignore
  const session = c.get('session');
  if (session?.id) {
    await deleteSessionById(client, session.id);
  }

  // @ts-ignore
  c.set('resolvedSession', null);
  // @ts-ignore
  c.set('session', null);
  // @ts-ignore
  c.set('user', null);
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
