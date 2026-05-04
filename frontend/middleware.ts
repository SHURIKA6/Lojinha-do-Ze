import { NextResponse, NextRequest } from 'next/server';

type AuthResult =
  | { kind: 'unauth' }
  | { kind: 'error' }
  | { kind: 'auth'; user: { role: string; [key: string]: any } };

// Cache simples para evitar validações repetidas em curto espaço de tempo
interface CacheEntry {
  result: AuthResult;
  expiresAt: number;
}

const authCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 minuto

/**
 * Obtém o resultado do cache se válido.
 * Remove entradas expiradas automaticamente.
 */
function getCachedAuth(sessionKey: string): AuthResult | null {
  const entry = authCache.get(sessionKey);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    authCache.delete(sessionKey);
    return null;
  }
  
  return entry.result;
}

/**
 * Armazena o resultado no cache com TTL.
 * Limpeza ocasional para evitar crescimento infinito.
 */
function setCachedAuth(sessionKey: string, result: AuthResult): void {
  authCache.set(sessionKey, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  
  // Limpeza simples: remover entradas expiradas se o cache ficar grande
  if (authCache.size > 100) {
    for (const [key, entry] of authCache.entries()) {
      if (Date.now() > entry.expiresAt) {
        authCache.delete(key);
      }
    }
  }
}

async function fetchMe(request: NextRequest, sessionKey: string): Promise<AuthResult> {
  // Verifica se há resultado em cache
  const cached = getCachedAuth(sessionKey);
  if (cached) {
    return cached;
  }

  const meUrl = request.nextUrl.clone();
  meUrl.pathname = '/api/auth/me';
  meUrl.search = '';

  try {
    const res = await fetch(meUrl, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) {
      const result: AuthResult = { kind: 'unauth' };
      setCachedAuth(sessionKey, result);
      return result;
    }

    if (!res.ok) {
      const result: AuthResult = { kind: 'error' };
      // Não faz cache de erros para permitir retry rápido
      return result;
    }

    const payload = await res.json();
    const user = payload.success && payload.data?.user ? payload.data.user : payload.user || payload;
    const result: AuthResult = { kind: 'auth', user };
    setCachedAuth(sessionKey, result);
    return result;
  } catch {
    return { kind: 'error' };
  }
}

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = request.cookies.has('lz_session');
  const sessionCookieValue = request.cookies.get('lz_session')?.value || '';

  if (!hasSession && (pathname.startsWith('/admin') || pathname.startsWith('/conta'))) {
    return redirect(request, '/login');
  }

  let result: AuthResult = { kind: 'unauth' };

  if (hasSession && sessionCookieValue) {
    const parts = sessionCookieValue.split('|');
    if (parts.length >= 3) {
      result = { kind: 'auth', user: { role: parts[2] } };
    }
  }

  if (result.kind === 'unauth' && hasSession && sessionCookieValue) {
    result = await fetchMe(request, sessionCookieValue);
  }

  if (result.kind === 'error') {
    if (pathname === '/login') {
      return NextResponse.next();
    }

    return redirect(request, '/login');
  }

  if (pathname === '/login') {
    if (result.kind !== 'auth') {
      return NextResponse.next();
    }

    return redirect(
      request,
      result.user.role === 'admin' ? '/admin/dashboard' : '/conta'
    );
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname === '/api/dashboard') {
    if (result.kind !== 'auth' || result.user.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Acesso negado. Privilégios administrativos necessários.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = '/404-not-found';
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/conta')) {
    if (result.kind !== 'auth') {
      return redirect(request, '/login');
    }

    if (result.user.role === 'admin') {
      return redirect(request, '/admin/dashboard');
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/conta/:path*', '/api/admin/:path*', '/api/dashboard', '/api/debug', '/login'],
};
