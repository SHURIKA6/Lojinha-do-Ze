/**
 * API Client - Lojinha do Zé
 * 
 * Cliente HTTP centralizado com tratamento de erros,
 * renovação automática de token CSRF e suporte a AbortSignal.
 */

import { getCsrfToken, setCsrfToken } from '@/lib/csrf';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const DEFAULT_TIMEOUT = 10000; // 10 seconds

export async function request<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit & { signal?: AbortSignal } = {}
): Promise<T> {
  const { signal, ...fetchOptions } = options;
  
  // Create a timeout signal if no signal provided
  let timeoutId: NodeJS.Timeout | undefined;
  let timeoutSignal: AbortSignal | undefined;
  
  if (!signal) {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
    timeoutSignal = controller.signal;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken() || '',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Remove Content-Type para FormData (o browser define com boundary)
  if (fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const effectiveSignal = signal || timeoutSignal;
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: effectiveSignal,
    });

    // Atualiza CSRF token se fornecido no header
    const newCsrfToken = response.headers.get('X-CSRF-Token');
    if (newCsrfToken) {
      setCsrfToken(newCsrfToken);
    }

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignora erro de parse
      }
      throw new ApiError(
        (errorData.error as string) || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Para respostas 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data: T = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Erro desconhecido na requisição',
      0,
      {}
    );
  }
}

export function getCsrfHeader(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}
