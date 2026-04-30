const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const API_BASE = '/api';

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

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  return cookies
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length) || '';
}

export function getCsrfToken(): string {
  return readCookie('lz_csrf');
}

function buildUrl(endpoint: string): string {
  return `${API_BASE}${endpoint}`;
}

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

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  if (!isFormData && options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(endpoint), {
      ...options,
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error: any) {
    if (error instanceof TypeError) {
      throw new ApiError(
        `Falha de rede (${endpoint}): ${error.message}. Verifique sua conexão ou se um adblocker está bloqueando a requisição.`,
        0,
        null
      );
    }

    throw error;
  }

  // Se receber 401 e não for uma rota que já é de autenticação (evitar loop infinito)
  if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/logout') {
    try {
      // Tenta renovar a sessão
      const refreshRes = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Se renovou com sucesso, repete a requisição original
        // Importante: Recriamos as headers para pegar o novo CSRF token
        const newHeaders = new Headers(options.headers || {});
        if (!SAFE_METHODS.has(method)) {
          const newCsrf = getCsrfToken();
          if (newCsrf) newHeaders.set('X-CSRF-Token', newCsrf);
        }
        if (!isFormData && options.body !== undefined && !newHeaders.has('Content-Type')) {
          newHeaders.set('Content-Type', 'application/json');
        }

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
    
    // Se falhar o refresh ou der erro, o parseResponse original vai disparar o evento auth:expired
  }

  return parseResponse(response, 'Erro na requisição');
}