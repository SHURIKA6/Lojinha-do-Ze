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

  // Fail-open: if the auth check fails due to network/runtime, let the client-side guards handle it.
  const result = await fetchMe(request);
  if (result.kind === 'error') {
    return NextResponse.next();
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
    if (result.kind !== 'auth') {
      return redirect(request, '/login');
    }

    if (result.user.role !== 'admin') {
      return redirect(request, '/conta');
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
