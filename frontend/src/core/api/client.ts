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
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        'Não foi possível conectar ao servidor. Verifique se o backend está online e acessível.',
        0,
        null
      );
    }

    throw error;
  }

  return parseResponse(response, 'Erro na requisição');
}