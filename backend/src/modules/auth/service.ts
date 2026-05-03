import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  CSRF_COOKIE_NAME,
  PASSWORD_SETUP_CODE_LENGTH,
  PASSWORD_SETUP_TTL_HOURS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
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
import { RefreshTokenService } from './refreshTokenService';

type AppEnv = { Bindings: Bindings; Variables: Variables };

/**
 * Obtém o contexto de execução de um contexto Hono.
 * Usado para tarefas em background no Cloudflare Workers (waitUntil).
 * 
 * @param c - Objeto de contexto Hono
 * @returns Contexto de execução se disponível, undefined caso contrário
 */
function getExecutionCtx(c: any): any {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}

/**
 * Representa uma sessão totalmente resolvida com os dados do usuário anexados.
 * Este é o objeto de sessão principal usado em toda a aplicação.
 */
type ResolvedSession = {
  /** Identificador único da sessão */
  id: string;
  /** ID do usuário associado a esta sessão */
  userId: string;
  /** Token CSRF para o padrão de double-submit cookie */
  csrfToken: string;
  /** Data e hora em que esta sessão expira */
  expiresAt: Date;
  /** Objeto completo do usuário associado a esta sessão */
  user: User;
};

/**
 * Type guard para verificar se um valor é um objeto User válido.
 * Verifica se o objeto possui as propriedades obrigatórias do User (id e role).
 * 
 * @param value - Valor a ser verificado
 * @returns True se o valor for um User válido, false caso contrário
 */
function isResolvedSessionUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.role === 'string';
}

/**
 * Normaliza um valor do cache em um objeto ResolvedSession válido.
 * Valida todos os campos obrigatórios e converte strings de data em objetos Date.
 * 
 * @param value - Valor do cache a ser normalizado
 * @returns ResolvedSession válido ou null se inválido
 */
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

/**
 * Constrói um objeto ResolvedSession a partir de uma linha do banco e dados opcionais do usuário.
 * Lida com nomes de propriedades em snake_case (DB) e camelCase (JS).
 * 
 * @param row - Linha do banco de dados contendo sessão e opcionalmente dados do usuário
 * @param user - Dados do usuário pré-buscados opcionais (se não estiverem na linha)
 * @returns Objeto ResolvedSession totalmente construído
 */
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

/**
 * Armazena a sessão resolvida no contexto Hono para handlers downstream.
 * Define múltiplas variáveis de contexto para padrões de acesso flexíveis.
 * 
 * @param c - Objeto de contexto Hono
 * @param session - Sessão resolvida a ser armazenada, ou null para limpar
 */
function storeResolvedSession(c: Context<AppEnv>, session: ResolvedSession | null) {
  c.set('resolvedSession', session);
  c.set('session', session);
  c.set('user', session?.user ?? null);
}

/**
 * Verifica se a requisição atual está usando o protocolo HTTPS.
 * Usado para determinar se cookies seguros devem ser definidos.
 * 
 * @param c - Objeto de contexto Hono
 * @returns True se a requisição for segura (HTTPS), false caso contrário
 */
function isSecureRequest(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:';
}

/**
 * Gera opções de cookie de sessão baseadas no ambiente e na requisição.
 * SEC-04: sameSite: 'Strict' impede o envio de cookies em navegação cross-site.
 * SEC-11: Cookie CSRF usa httpOnly: false intencionalmente (padrão double-submit cookie).
 *         Proteção primária contra XSS para token CSRF é CSP + guarda de origem.
 * 
 * @param c - Objeto de contexto Hono
 * @param maxAge - Tempo máximo do cookie em segundos (padrão: SESSION_TTL_SECONDS)
 * @param httpOnly - Se o cookie deve ser apenas HTTP (padrão: true)
 * @returns Objeto de opções de cookie para setCookie
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

/**
 * Converte uma linha de usuário do banco de dados (UserDB) para um objeto User.
 * Faz o parse de campos JSON (como address) e converte strings de data em objetos Date.
 * 
 * @param row - Linha do banco de dados contendo dados do usuário
 * @returns Objeto User normalizado
 */
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


/**
 * Autentica um usuário com seu identificador (email ou CPF) e senha.
 * Lida com múltiplos cenários de autenticação, incluindo hashes de senha legados.
 * Implementa bloqueio de conta após 5 tentativas falhas (bloqueio de 15 minutos).
 * 
 * @param db - Cliente do banco de dados para executar consultas
 * @param identifier - Email ou CPF do usuário (case-insensitive)
 * @param password - Senha do usuário a ser verificada
 * @returns Objeto do usuário autenticado
 * @throws Error com mensagem 'Credenciais inválidas' se a autenticação falhar
 * @throws Error com mensagem de bloqueio se a conta estiver temporariamente bloqueada
 */
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

  // SEC-12: Verificação de bloqueio de conta por tentativas excessivas
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const diff = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000));
    throw new Error(`Conta temporariamente bloqueada por segurança. Tente novamente em ${diff} minutos.`);
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
    });
    validPassword = false;
  }
  
  if (!validPassword) {
    // Incrementa tentativas falhas
    const attempts = (user.login_attempts || 0) + 1;
    const MAX_ATTEMPTS = 5;
    
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Bloqueio de 15 minutos
      await userRepository.updateLoginAttempts(db, parseInt(user.id), attempts, lockedUntil);
      
      logger.warn(`Conta bloqueada por excesso de tentativas`, { 
        userId: user.id, 
        email: user.email,
        attempts 
      });
      
      throw new Error('Muitas tentativas falhas. Conta bloqueada por 15 minutos por segurança.');
    } else {
      await userRepository.updateLoginAttempts(db, parseInt(user.id), attempts);
      throw new Error('Credenciais inválidas');
    }
  }

  // Resetar tentativas após sucesso
  if (user.login_attempts > 0 || user.locked_until) {
    await userRepository.updateLoginAttempts(db, parseInt(user.id), 0, null);
  }

  return user;
}


/**
 * Cria uma nova sessão para um usuário autenticado.
 * Gera token de sessão, token CSRF e refresh token.
 * Armazena a sessão no banco de dados e no cache para consulta rápida.
 * Define cookies de sessão e CSRF na resposta.
 * 
 * @param c - Objeto de contexto Hono (usado para cookies e contexto de execução)
 * @param client - Cliente do banco de dados para executar consultas
 * @param user - Objeto do usuário (formato User ou UserDB)
 * @returns Objeto contendo o token CSRF para a nova sessão
 */
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
    ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || null,
    userAgent: c.req.header('user-agent') || null,
  });

  if (!createdSession) {
    logger.error('Falha ao criar registro de sessão no banco de dados', { userId: resolvedUser.id });
    throw new Error('Erro ao processar login. Tente novamente.');
  }

  const session = buildResolvedSession(createdSession, resolvedUser);

  // PERF: Alimenta o cache imediatamente para acelerar a próxima requisição
  // Não precisamos de await aqui se o ctx for fornecido, pois o setSession usará waitUntil internamente
  await cacheService.setSession(tokenHash, session, SESSION_TTL_SECONDS, c.env?.CACHE_KV, getExecutionCtx(c));

  // SEC: Refresh Token para renovação de sessão
  const refreshTokenService = getRefreshTokenService(client);
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '0.0.0.0';
  const userAgent = c.req.header('user-agent') || 'unknown';
  
  const refreshToken = await refreshTokenService.createRefreshToken(
    parseInt(resolvedUser.id), 
    session.id, 
    ipAddress, 
    userAgent,
    c.env,
    getExecutionCtx(c)
  );

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(c));
  setCookie(c, CSRF_COOKIE_NAME, csrfToken, sessionCookieOptions(c, SESSION_TTL_SECONDS, false));
  setCookie(c, REFRESH_TOKEN_COOKIE_NAME, refreshToken, sessionCookieOptions(c, REFRESH_TOKEN_TTL_SECONDS));

  logger.info('Sessão e Refresh Token emitidos com sucesso', { userId: resolvedUser.id, sessionId: createdSession.id });

  return { csrfToken };
}

/**
 * Limpa todos os cookies relacionados à autenticação da resposta.
 * Remove cookies de sessão, CSRF e refresh token.
 * 
 * @param c - Objeto de contexto Hono
 */
export function clearSessionCookies(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  deleteCookie(c, CSRF_COOKIE_NAME, { path: '/' });
  deleteCookie(c, REFRESH_TOKEN_COOKIE_NAME, { path: '/' });
}

/**
 * Destrói completamente a sessão atual.
 * Remove a sessão do banco de dados e do cache, depois limpa os cookies.
 * Deve ser chamado no logout explícito.
 * 
 * @param c - Objeto de contexto Hono
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function destroySession(c: Context<AppEnv>, client: Database) {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionToken) {
    const tokenHash = await sha256Hex(sessionToken);
    await deleteSessionByTokenHash(client, tokenHash);
    await cacheService.deleteSession(tokenHash, c.env?.CACHE_KV, getExecutionCtx(c));
  }

  clearSessionCookies(c);
}

/**
 * Resolve a sessão atual a partir da requisição.
 * Implementa resolução de sessão em múltiplas camadas:
 * 1. Verifica cache de contexto (já resolvido nesta requisição)
 * 2. Verifica cache distribuído (caminho rápido)
 * 3. Consulta banco de dados (caminho lento)
 * Executa limpeza probabilística de sessões expiradas.
 * Atualiza o timestamp last_seen_at da sessão assincronamente.
 * 
 * @param c - Objeto de contexto Hono
 * @param client - Cliente do banco de dados para executar consultas
 * @returns ResolvedSession se uma sessão válida for encontrada, null caso contrário
 */
export async function resolveSession(c: Context<AppEnv>, client: Database) {
  const cached = c.get('resolvedSession');
  if (cached !== undefined) {
    return cached;
  }

  // PERF-05: Limpeza probabilística — executa apenas ~1% das vezes em background
  if (Math.random() < 0.01) {
    const cleanupTask = deleteExpiredSessions(client).catch(err => logger.error('Erro na limpeza de sessões expiradas', err));
    if (getExecutionCtx(c)?.waitUntil) {
      getExecutionCtx(c).waitUntil(cleanupTask);
    }
  }

  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    c.set('resolvedSession', null);
    return null;
  }

  const tokenHash = await sha256Hex(sessionToken);

  // PERF: Tenta obter do cache antes de consultar o banco
  const fromCache = await cacheService.getSession(tokenHash, c.env?.CACHE_KV, getExecutionCtx(c));
  if (fromCache) {
    const session = normalizeResolvedSession(fromCache);
    if (session) {
      storeResolvedSession(c, session);
      return session;
    }

    logger.warn('Entrada inválida no cache de sessão ignorada; consultando banco', {
      tokenHashPrefix: tokenHash.slice(0, 8),
    });
    await cacheService.deleteSession(tokenHash, c.env?.CACHE_KV, getExecutionCtx(c));
  }

  const row = await findSessionByTokenHash(client, tokenHash);
  if (!row) {
    clearSessionCookies(c);
    storeResolvedSession(c, null);
    return null;
  }

  const session = buildResolvedSession(row);

  // Alimenta o cache para as próximas chamadas
  await cacheService.setSession(tokenHash, session, SESSION_TTL_SECONDS, c.env?.CACHE_KV, getExecutionCtx(c));

  storeResolvedSession(c, session);

  try {
    const touchTask = touchSession(client, session.id).catch(err => logger.error('Erro ao atualizar sessão (touch)', err));
    if (getExecutionCtx(c)?.waitUntil) {
      getExecutionCtx(c).waitUntil(touchTask);
    } else {
      await touchTask;
    }
  } catch (error) {
    logger.error('Erro inesperado ao disparar touch de sessão', error);
  }

  return session;
}

/**
 * Invalida a sessão atualmente resolvida.
 * Exclui a sessão do banco de dados e limpa todos os cookies de sessão.
 * Usado quando um evento de segurança exige o encerramento imediato da sessão.
 * 
 * @param c - Objeto de contexto Hono
 * @param client - Cliente do banco de dados para executar consultas
 */
export async function invalidateResolvedSession(c: Context<AppEnv>, client: Database) {
  const session = c.get('session');
  if (session?.id) {
    await deleteSessionById(client, session.id);
  }

  storeResolvedSession(c, null);
  clearSessionCookies(c);
}

/**
 * Gera um convite de configuração de senha para um usuário.
 * Cria um token de configuração com um código que pode ser usado para definir a senha inicial.
 * Revoga quaisquer tokens abertos existentes para o usuário antes de criar um novo.
 * 
 * @param c - Objeto de contexto Hono (usado para determinar a URL do frontend)
 * @param client - Cliente do banco de dados para executar consultas
 * @param user - Objeto do usuário para gerar o convite
 * @returns Objeto contendo URL de configuração, código de configuração e data de expiração
 */
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

/**
 * Consome um token ou código de convite de configuração de senha.
 * Valida o token/código, marca como consumido e retorna os dados do usuário.
 * Funciona apenas com tokens válidos, não expirados e não consumidos.
 * 
 * @param client - Cliente do banco de dados para executar consultas
 * @param lookup - Objeto contendo token ou código para buscar
 * @returns Objeto com ID do convite e dados do usuário se válido, null caso contrário
 */
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

// O serviço global é inicializado com null e deve ser usado via getRefreshTokenService(db)
export const refreshTokenService = new RefreshTokenService(null as any as Database, cacheService);

/**
 * Vincula o banco de dados dinamicamente ao serviço de refresh token
 * Cria uma nova instância de RefreshTokenService vinculada ao cliente do banco de dados fornecido.
 * Use isso em vez da instância global refreshTokenService para vinculação adequada do DB.
 * 
 * @param db - Cliente do banco de dados para vincular ao serviço
 * @returns Instância de RefreshTokenService com a vinculação de banco de dados especificada
 */
export function getRefreshTokenService(db: Database) {
  return new RefreshTokenService(db, cacheService);
}
