import { NextResponse } from 'next/server';

async function fetchMe(request) {
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
      return { kind: 'unauth' };
    }

    if (!res.ok) {
      return { kind: 'error' };
    }

    return { kind: 'auth', user: await res.json() };
  } catch {
    return { kind: 'error' };
  }
}

function redirect(request, pathname) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('lz_session');

  // Skip fetch if no session and hitting protected routes
  if (!hasSession && (pathname.startsWith('/admin') || pathname.startsWith('/conta'))) {
    return redirect(request, '/login');
  }

  // Fail-closed: if the auth check fails due to network/runtime, redirect to login for protected routes.
  const result = hasSession ? await fetchMe(request) : { kind: 'unauth' };
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

  if (pathname.startsWith('/admin')) {
    if (result.kind !== 'auth' || result.user.role !== 'admin') {
      // Retorna 404 em vez de redirecionar para esconder a existência da rota
      const url = request.nextUrl.clone();
      url.pathname = '/404-not-found'; // Rota inexistente para forçar 404
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
  matcher: ['/admin/:path*', '/conta/:path*', '/login'],
};
