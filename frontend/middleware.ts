import { NextRequest, NextResponse } from 'next/server';

interface AuthUser {
  id: string;
  role: 'admin' | 'shura' | 'customer' | 'editor';
  email: string;
}

type AuthResult = 
  | { kind: 'auth'; user: AuthUser }
  | { kind: 'unauth' }
  | { kind: 'error' };

async function fetchMe(request: NextRequest): Promise<AuthResult> {
  // Chamada direta para o backend para evitar problemas de proxy interno no middleware
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://lojinha-do-ze-backend.fernandoriaddasilvaribeiro.workers.dev/api';
  const meUrl = `${backendUrl}/auth/me`;

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

    const data = await res.json();
    return { kind: 'auth', user: data.data?.user || data.user };
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

  // Interceptar requisições para robots.txt com pegadinha
  if (pathname === '/robots.txt') {
    const robotsTxt = `# robots.txt da Lojinha do Zé
# Última atualização: 29/03/2026

User-agent: *
Disallow: /tesouro-secreto
Disallow: /chave-mestra
Disallow: /caminho-proibido
Disallow: /easter-egg-nao-existe

# ⚠️ ATENÇÃO ⚠️
# Se você está lendo isso, você é oficialmente um curioso!
# 
# Mas calma, não tem nada de especial aqui...
# Ou será que tem? 🤔
#
# Continue procurando... quem sabe o que você encontra?
#
#        ___
#       /   \\
#      | o o |
#      |  ^  |
#       \\___/
#    Zé está de olho!
#
# Dica: Olhe para o código-fonte... 👀
#
# Quer saber um segredo? Digite:
# ↑ ↑ ↓ ↓ ← → ← → B A
# no teclado agora! 😄
#
# Brincadeira! Mas você tentou, né? 😂
#
# Agora vá trabalhar! 🛒
# www.lojinha-do-ze.vercel.app`;

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const hasSession = request.cookies.has('lz_session');

  // Skip fetch if no session and hitting protected routes
  if (!hasSession && (pathname.startsWith('/admin') || pathname.startsWith('/conta'))) {
    return redirect(request, '/login');
  }

  // Fail-closed: if the auth check fails due to network/runtime, redirect to login for protected routes.
  const result: AuthResult = hasSession ? await fetchMe(request) : { kind: 'unauth' };
  
  if (result.kind === 'error') {
    if (pathname === '/login') {
      return NextResponse.next();
    }

    return redirect(request, '/login');
  }

  if (pathname === '/login') {
    if (result.kind === 'auth' && result.user) {
      const isStaff = result.user.role === 'admin' || result.user.role === 'shura' || result.user.role === 'editor';
      return redirect(
        request,
        isStaff ? '/admin/dashboard' : '/conta'
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (result.kind !== 'auth') {
      return redirect(request, '/login');
    }

    const isStaff = result.user.role === 'admin' || result.user.role === 'shura' || result.user.role === 'editor';
    if (isStaff) {
      return NextResponse.next();
    }

    // Retorna 404 em vez de redirecionar para esconder a existência da rota
    const url = request.nextUrl.clone();
    url.pathname = '/404-not-found'; // Rota inexistente para forçar 404
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith('/conta')) {
    if (result.kind !== 'auth') {
      return redirect(request, '/login');
    }

    const isStaff = result.user.role === 'admin' || result.user.role === 'shura' || result.user.role === 'editor';
    if (isStaff) {
      return redirect(request, '/admin/dashboard');
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/conta/:path*', '/login', '/robots.txt'],
};
