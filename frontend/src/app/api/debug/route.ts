import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://lojinha-do-ze-api.fernandoriaddasilvaribeiro.workers.dev';

export async function GET(request: NextRequest) {
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
