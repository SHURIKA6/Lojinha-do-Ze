import { NextResponse } from 'next/server';

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
]);

/**
 * Constrói os headers a serem enviados ao backend.
 * Repassa o cookie e demais cabeçalhos relevantes, removendo os problemáticos.
 */
function buildProxyHeaders(request) {
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  }
  return headers;
}

/**
 * Cria uma resposta Next.js que repassa os Set-Cookie e demais headers do backend.
 */
function buildProxyResponse(backendResponse, body) {
  const response = new NextResponse(JSON.stringify(body), {
    status: backendResponse.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Repassar todos os Set-Cookie do backend para o browser
  const setCookies = backendResponse.headers.getSetCookie?.() 
    ?? backendResponse.headers.get('set-cookie')?.split(/,(?=\s*\w+=)/) 
    ?? [];

  for (const cookie of setCookies) {
    if (cookie) {
      response.headers.append('Set-Cookie', cookie);
    }
  }

  return response;
}

async function parseBackendResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return { error: 'Resposta inválida do servidor' };
    }
  }

  try {
    const text = await response.text();
    return { error: text || 'Erro desconhecido' };
  } catch {
    return { error: 'Erro ao ler resposta do servidor' };
  }
}

async function proxyRequest(request, params, method) {
  // Next.js 15+: params é uma Promise
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const backendUrl = `${BACKEND_URL}/api/${path}${queryString}`;

  const headers = buildProxyHeaders(request);

  const fetchOptions = {
    method,
    headers,
  };

  // Ler o body para métodos que o exigem
  if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await request.json();
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = await request.text();
      }
    } catch {
      // Body vazio é válido para algumas requisições
    }
  }

  try {
    const response = await fetch(backendUrl, fetchOptions);
    const data = await parseBackendResponse(response);
    return buildProxyResponse(response, data);
  } catch (error) {
    console.error(`Proxy error (${method} /api/${path}):`, error?.message || error);
    return NextResponse.json(
      { error: 'Erro ao conectar ao servidor' },
      { status: 502 }
    );
  }
}

export async function GET(request, { params }) {
  return proxyRequest(request, params, 'GET');
}

export async function POST(request, { params }) {
  return proxyRequest(request, params, 'POST');
}

export async function PUT(request, { params }) {
  return proxyRequest(request, params, 'PUT');
}

export async function PATCH(request, { params }) {
  return proxyRequest(request, params, 'PATCH');
}

export async function DELETE(request, { params }) {
  return proxyRequest(request, params, 'DELETE');
}