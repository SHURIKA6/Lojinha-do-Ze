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

/**
 * Normaliza um valor de origem extraindo a origem de uma string de URL.
 * Retorna null se o valor for falso ou não for uma URL válida.
 *
 * @param {any} value - O valor a ser normalizado (espera-se que seja uma string de URL)
 * @returns {string | null} A origem normalizada (ex: "https://example.com") ou null
 */
function normalizeOrigin(value: any): string | null {
  if (!value) return null;

  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

/**
 * Divide uma string CSV (valores separados por vírgula) em um array de strings sem espaços extras.
 * Filtra entradas vazias.
 *
 * @param {any} value - A string CSV a ser dividida
 * @returns {string[]} Array de strings não vazias sem espaços extras
 */
function splitCsv(value: any): string[] {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Normaliza um valor de host extraindo e limpando o nome do host.
 * Remove quaisquer componentes de caminho e aspas ao redor.
 *
 * @param {any} value - O valor de host a ser normalizado
 * @returns {string | null} O host normalizado ou null se inválido
 */
function normalizeHost(value: any): string | null {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const withoutPath = trimmed.split('/')[0];
  const host = withoutPath.replace(/^"|"$/g, '');
  return host || null;
}

/**
 * Analisa o header HTTP Forwarded (RFC 7239) e extrai os parâmetros.
 * Processa apenas a primeira entrada se houver múltiplas (separadas por vírgula).
 *
 * @param {any} forwardedHeader - O valor do header Forwarded
 * @returns {Record<string, string> | null} Objeto com parâmetros encaminhados ou null se inválido
 */
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

/**
 * Extrai e normaliza a origem do header Forwarded.
 * Combina os parâmetros proto e host para construir a URL completa da origem.
 *
 * @param {any} forwardedHeader - O valor do header Forwarded
 * @returns {string | null} A origem normalizada ou null se não encontrada
 */
function parseForwardedOrigin(forwardedHeader: any): string | null {
  const params = parseForwardedParams(forwardedHeader);
  if (!params) return null;

  const proto = params.proto;
  const host = params.host;
  if (!proto || !host) return null;

  return normalizeOrigin(`${proto}://${host}`);
}

/**
 * Extrai o host encaminhado de vários headers de proxy.
 * Verifica primeiro o header Forwarded, depois faz fallback para X-Forwarded-Host e X-Original-Host.
 *
 * Nota de segurança: Estes headers são fornecidos pelo cliente e devem ser confiáveis
 * apenas quando TRUST_PROXY está habilitado no ambiente.
 *
 * @param {Context<any>} c - O contexto Hono
 * @returns {string | null} O host encaminhado ou null se não encontrado
 */
function getForwardedHost(c: Context<any>): string | null {
  const params = parseForwardedParams(c.req.header('forwarded'));
  if (params?.host) {
    return normalizeHost(params.host);
  }

  return normalizeHost(
    (c.req.header('x-forwarded-host') || c.req.header('x-original-host') || '').split(',')[0]
  );
}

/**
 * Reconstrói a origem a partir de headers encaminhados (proto + host).
 * Verifica primeiro o header Forwarded, depois X-Forwarded-Proto e X-Forwarded-Host.
 *
 * Nota de segurança: Estes headers são fornecidos pelo cliente e devem ser confiáveis
 * apenas quando TRUST_PROXY está habilitado no ambiente.
 *
 * @param {Context<any>} c - O contexto Hono
 * @returns {string | null} A origem reconstruída ou null se não encontrada
 */
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

/**
 * Constrói o conjunto de origens e hosts permitidos a partir da configuração do ambiente.
 * Mescla origens de desenvolvimento local, ALLOWED_ORIGINS configuradas e FRONTEND_URL.
 *
 * @param {Context<any>} c - O contexto Hono contendo os bindings do ambiente
 * @returns {{ allowedOrigins: Set<string>, allowedHosts: Set<string> }} Conjuntos de origens e hosts permitidos
 */
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

/**
 * Verifica se a origem fornecida é permitida para requisições CORS.
 * Valida contra origens configuradas, hosts e headers encaminhados.
 *
 * Implicações de segurança:
 * - Confia em headers encaminhados (x-forwarded-*, forwarded) apenas quando TRUST_PROXY está habilitado
 * - Compara tanto URLs de origem completas quanto entradas apenas de host
 * - Permite requisições de mesma origem automaticamente (origem corresponde à URL da requisição)
 *
 * @param {string | undefined} origin - O valor do header origin da requisição
 * @param {Context<any>} c - O contexto Hono contendo os bindings do ambiente
 * @returns {boolean} True se a origem for permitida, false caso contrário
 */
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

/**
 * Cria um middleware CORS configurado com origens permitidas do ambiente.
 * Usa validação dinâmica de origem via isAllowedOrigin().
 * Permite credenciais e define headers apropriados para requisições cross-origin.
 *
 * Implicações de segurança:
 * - Permite apenas origens explicitamente configuradas nas variáveis de ambiente
 * - Credenciais (cookies, headers de autenticação) são permitidas para origens confiáveis
 * - Requisições preflight são cacheadas por 24 horas (maxAge: 86400)
 *
 * @returns {MiddlewareHandler} Um handler de middleware CORS Hono
 */
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

/**
 * Middleware que protege contra requisições cross-origin não autorizadas para métodos não-seguros.
 * Permite requisições de mesma origem e mesmo site automaticamente (via header Sec-Fetch-Site).
 * Bloqueia requisições de origens não permitidas com status 403.
 *
 * Implicações de segurança:
 * - Aplicado apenas para métodos não-seguros (POST, PUT, DELETE, etc.)
 * - Métodos seguros (GET, HEAD, OPTIONS) ignoram a proteção
 * - Usa o header Sec-Fetch-Site como sinal adicional de confiança
 * - Previne ataques CSRF validando a origem em operações que mudam estado
 *
 * @type {MiddlewareHandler<{ Bindings: Bindings }>}
 */
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

/**
 * Middleware que aplica headers de segurança a todas as respostas.
 * Headers incluem Content-Security-Policy, X-Content-Type-Options, etc.
 * Melhora a proteção contra vulnerabilidades web comuns (XSS, clickjacking, etc.).
 *
 * @type {MiddlewareHandler}
 */
export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  const response = await next();
  applySecurityHeaders(c);
  return response;
};
