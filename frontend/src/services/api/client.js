const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Always use same-origin proxy (/api/*). The route handler in `src/app/api/[...path]/route.js`
// forwards requests to the real backend (Worker or local wrangler).
export const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function readCookie(name) {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length) || '';
}

export function getCsrfToken() {
  return readCookie('lz_csrf');
}

function buildUrl(endpoint) {
  return `${API_BASE}${endpoint}`;
}

async function parseResponse(res, fallbackMessage) {
  let data = null;
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

export async function request(endpoint, options = {}) {
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

  let response;
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
