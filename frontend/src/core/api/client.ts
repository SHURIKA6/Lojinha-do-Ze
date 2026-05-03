/**
 * Cliente HTTP Centralizado da Lojinha do Zé
 * 
 * Gerencia todas as requisições para a API interna do Next.js (/api).
 * Implementa:
 * - CSRF Token automático para métodos mutantes
 * - Renovação automática de sessão (refresh token)
 * - Tratamento centralizado de erros
 * - Dispatch de evento de sessão expirada
 */

// Métodos considerados seguros (não requerem CSRF token)
// Métodos HTTP seguros (não alteram estado)
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Base URL para todas as requisições da API interna
export const API_BASE = '/api';

/**
 * Erro customizado para falhas na API
 */
export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Lê um cookie específico do navegador
 * @param name - Nome do cookie a ser lido
 * @returns Valor do cookie ou string vazia
 */
function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  return cookies
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length) || '';
}

/**
 * Recupera o token CSRF armazenado no cookie lz_csrf
 */
export function getCsrfToken(): string {
  return readCookie('lz_csrf');
}

/**
 * Constrói a URL completa do endpoint
 * @param endpoint - Caminho relativo da API (ex: /auth/login)
 */
function buildUrl(endpoint: string): string {
  return `${API_BASE}${endpoint}`;
}

/**
 * Processa a resposta da API, tratando JSON ou texto plano
 * Dispara evento 'auth:expired' se receber 401 Unauthorized
 */
async function parseResponse(res: Response, fallbackMessage: string): Promise<any> {
  let data: any = null;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await res.text();
      if (text) {
        data = { error: text };
      }
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const error = new ApiError(
      data?.error || data?.message || fallbackMessage,
      res.status,
      data
    );

    // Dispara evento customizado para sessão expirada
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    throw error;
  }

  return data;
}

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Função principal para fazer requisições à API
 * 
 * Funcionalidades:
 * - Inclui CSRF token automaticamente para métodos não seguros
 * - Define Content-Type como JSON (exceto FormData)
 * - Tenta renovar sessão automaticamente em caso de 401
 * - Trata erros de rede (TypeError)
 * 
 * @param endpoint - Caminho da API (ex: /products)
 * @param options - Opções do fetch (method, body, headers, etc)
 * @returns Promise com os dados da resposta
 */
/**
 * Função principal para requisições à API
 */
 export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  // Adiciona CSRF token para métodos não seguros
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  // Define Content-Type padrão se não for FormData
  if (!isFormData && options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint), {
      ...options,
      method,
      headers,
      credentials: 'include', // Envia cookies (necessário para sessão)
      cache: 'no-store', // Evita cache da API
    });
  } catch (error: any) {
    // Trata erros de rede (offline, bloqueio de adblocker, etc)
    if (error instanceof TypeError) {
      throw new ApiError(
        `Falha de rede (${endpoint}): ${error.message}. Verifique sua conexão ou se um adblocker está bloqueando a requisição.`,
        0,
        null
      );
    }

    throw error;
  }

  // Tenta renovar sessão automaticamente se receber 401
  if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/logout') {
    try {
      const refreshRes = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Recria headers com novo CSRF token após refresh
        const newHeaders = new Headers(options.headers || {});
        if (!SAFE_METHODS.has(method)) {
          const newCsrf = getCsrfToken();
          if (newCsrf) newHeaders.set('X-CSRF-Token', newCsrf);
        }
        if (!isFormData && options.body !== undefined && !newHeaders.has('Content-Type')) {
          newHeaders.set('Content-Type', 'application/json');
        }

        // Refaz a requisição original com nova sessão
        const retryResponse = await fetch(buildUrl(endpoint), {
          ...options,
          method,
          headers: newHeaders,
          credentials: 'include',
          cache: 'no-store',
        });

        return parseResponse(retryResponse, 'Erro na requisição (retry)');
      }
    } catch (refreshError) {
      console.error('Erro ao tentar renovar sessão automaticamente', refreshError);
    }
  }

  return parseResponse(response, 'Erro na requisição');
}