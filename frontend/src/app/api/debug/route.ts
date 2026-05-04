import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://lojinha-do-ze-api.fernandoriaddasilvaribeiro.workers.dev';

/**
 * Verifica se o usuário é administrador através do cookie de sessão.
 * Retorna null se for admin, ou uma NextResponse de erro se não for.
 */
function checkAdminAuth(request: NextRequest): NextResponse | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('lz_session='));

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const sessionValue = sessionCookie.split('=')[1];
  if (!sessionValue) {
    return NextResponse.json({ error: 'Cookie de sessão inválido.' }, { status: 401 });
  }

  const sessionParts = sessionValue.split('|');
  if (sessionParts.length < 3) {
    return NextResponse.json({ error: 'Formato de cookie de sessão inválido.' }, { status: 401 });
  }

  const role = sessionParts[2].trim();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado. Privilégios administrativos necessários.' }, { status: 403 });
  }

  return null; // Usuário é admin
}

export async function GET(request: NextRequest) {
  // Proteção: desabilita rota de debug em produção
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // Verificação de autenticação e autorização
  const authError = checkAdminAuth(request);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const targetPath = url.searchParams.get('path') || 'health';

  // SSRF Protection: White-list of allowed debug paths
  const ALLOWED_DEBUG_PATHS = ['health', 'metrics', 'status', 'version'];
  if (!ALLOWED_DEBUG_PATHS.includes(targetPath)) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid debug path' },
      { status: 403 }
    );
  }

  const backendUrl = `${BACKEND_URL}/api/${targetPath}`;

  const diagnostics = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      BACKEND_URL_CONFIGURED: !!process.env.BACKEND_URL,
      BACKEND_URL_VALUE: process.env.NODE_ENV === 'development' ? BACKEND_URL : 'HIDDEN',
    },
    request: {
      url: request.url,
      method: request.method,
      targetPath,
      backendUrl,
    },
    test: {} as any
  };

  try {
    const start = Date.now();
    const res = await fetch(backendUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) 
    });
    const duration = Date.now() - start;
    
    diagnostics.test = {
      status: res.status,
      statusText: res.statusText,
      durationMs: duration,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries())
    };
  } catch (error: any) {
    diagnostics.test = {
      error: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Hidden in production',
      backendUrlTested: backendUrl
    };
  }

  return NextResponse.json(diagnostics);
}
