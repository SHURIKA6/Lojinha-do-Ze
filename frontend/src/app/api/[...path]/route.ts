import { NextResponse, NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://lojinha-do-ze-backend.riad777.workers.dev' 
    : 'http://127.0.0.1:8788');

/**
 * Headers que NÃO devem ser repassados ao backend.
 * O host original do Next.js confunde a validação de origem do Worker.
 */
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'http2-settings',
  'forwarded',
  'x-real-ip',
]);

const ALLOWED_REQUEST_HEADERS = new Set([
  'accept',
  'accept-language',
  'cache-control',
  'content-type',
  'cookie',
  'origin',
  'pragma',
  'referer',
  'user-agent',
  'x-csrf-token',
]);

const ALLOWED_RESPONSE_HEADERS = new Set([
  'cache-control',
  'content-disposition',
  'content-language',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'vary',
]);

/**
 * Constrói os headers a serem enviados ao backend.
 * Repassa o cookie e demais cabeçalhos relevantes, removendo os problemáticos.
 */
function buildProxyHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const normalizedKey = key.toLowerCase();
    if (
      STRIP_REQUEST_HEADERS.has(normalizedKey) ||
      normalizedKey.startsWith('x-forwarded-')
    ) {
      continue;
    }

    if (
      ALLOWED_REQUEST_HEADERS.has(normalizedKey) ||
      normalizedKey.startsWith('sec-fetch-')
    ) {
      headers.set(key, value);
    }
  }
  return headers;
}

/**
 * Cria uma resposta Next.js que repassa os Set-Cookie e demais headers do backend.
 */
function buildProxyResponse(backendResponse: Response): NextResponse {
  const headers = new Headers();
  for (const [key, value] of backendResponse.headers.entries()) {
    if (ALLOWED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers,
  });

  // Repassar todos os Set-Cookie do backend para o browser
  const setCookies = (backendResponse.headers as any).getSetCookie?.() 
    ?? backendResponse.headers.get('set-cookie')?.split(/,(?=\s*\w+=)/) 
    ?? [];

  for (const cookie of setCookies) {
    if (cookie) {
      response.headers.append('Set-Cookie', cookie);
    }
  }

  return response;
}

async function proxyRequest(request: NextRequest, params: { path: string[] } | Promise<{ path: string[] }>, method: string): Promise<NextResponse> {
  // Next.js 15+: params é uma Promise
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const backendUrl = `${BACKEND_URL}/api/${path}${queryString}`;

  const headers = buildProxyHeaders(request);

  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      fetchOptions.body = body;
    }
  }

  try {
    const response = await fetch(backendUrl, fetchOptions);
    return buildProxyResponse(response);
  } catch (error: any) {
    console.error(`Proxy error (${method} /api/${path}):`, error?.message || error);
    return NextResponse.json(
      { error: 'Erro ao conectar ao servidor' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params, 'PUT');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params, 'PATCH');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, params, 'DELETE');
}
