import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://lojinha-do-ze-api.fernandoriaddasilvaribeiro.workers.dev';

/**
 * Headers que NÃO devem ser repassados ao backend.
 * O host original do Next.js confunde a validação de origem do Worker.
 */
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'transfer-encoding',
  'content-length',
  'keep-alive',
  'upgrade',
  'http2-settings',
]);

/**
 * Constrói os headers a serem enviados ao backend.
 * Repassa o cookie e demais cabeçalhos relevantes, removendo os problemáticos.
 */
function buildProxyHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  }
  return headers;
}

/**
 * Cria uma resposta Next.js que repassa os Set-Cookie e demais headers do backend.
 * Suporta tanto respostas JSON quanto downloads de arquivos (blob).
 */
function buildProxyResponse(backendResponse: Response, body: any, isFileDownload: boolean = false): NextResponse {
  let response: NextResponse;
  
  if (isFileDownload) {
    // Para downloads de arquivos, repassa o blob diretamente
    response = new NextResponse(body, {
      status: backendResponse.status,
      headers: {},
    });
    
    // Repassa headers importantes para downloads
    const contentType = backendResponse.headers.get('content-type');
    const contentDisposition = backendResponse.headers.get('content-disposition');
    
    if (contentType) {
      response.headers.set('Content-Type', contentType);
    }
    if (contentDisposition) {
      response.headers.set('Content-Disposition', contentDisposition);
    }
  } else {
    // Para respostas JSON normais
    response = new NextResponse(JSON.stringify(body), {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Repassar todos os Set-Cookie do backend para o browser
  const setCookies = (backendResponse.headers as any).getSetCookie?.()
    ?? backendResponse.headers.get('set-cookie')?.split(/,(?=\s*\w+=)/)
    ?? [];

  for (let cookie of setCookies) {
    if (cookie) {
      // Remover flag Secure em desenvolvimento para permitir cookies em HTTP (localhost)
      if ((process.env.NODE_ENV as string) !== 'production' && cookie.toLowerCase().includes('secure')) {
        cookie = cookie.replace(/;?\s?secure/gi, '');
      }
      response.headers.append('Set-Cookie', cookie);
    }
  }

  return response;
}

async function parseBackendResponse(response: Response): Promise<{ data: any; isFile: boolean }> {
  const contentType = response.headers.get('content-type') || '';
  const contentDisposition = response.headers.get('content-disposition') || '';
  
  // Verifica se é um download de arquivo (CSV, PDF, etc)
  const isFileDownload =
    contentType.includes('text/csv') ||
    contentType.includes('application/pdf') ||
    contentType.includes('application/octet-stream') ||
    contentDisposition.includes('attachment') ||
    contentDisposition.includes('filename');
  
  if (isFileDownload) {
    // Para arquivos, retorna o blob diretamente
    try {
      const blob = await response.blob();
      return { data: blob, isFile: true };
    } catch {
      return { data: { error: 'Erro ao processar download do arquivo' }, isFile: false };
    }
  }
  
  if (contentType.includes('application/json')) {
    try {
      return { data: await response.json(), isFile: false };
    } catch {
      return { data: { error: 'Resposta inválida do servidor' }, isFile: false };
    }
  }

  try {
    const text = await response.text();
    return { data: { error: text || 'Erro desconhecido' }, isFile: false };
  } catch {
    return { data: { error: 'Erro ao ler resposta do servidor' }, isFile: false };
  }
}

async function proxyRequest(request: NextRequest, params: any, method: string): Promise<NextResponse> {
  const resolvedParams = await params;
  let parsedPath = resolvedParams.path.join('/');
  
  // Adblocker evasion: remap friendly paths back to the real backend endpoints
  if (parsedPath === 'panel-data') {
    parsedPath = 'dashboard';
  } else if (parsedPath === 'panel-metrics') {
    parsedPath = 'analytics';
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  const backendUrl = `${BACKEND_URL}/api/${parsedPath}${queryString}`;

  const headers = buildProxyHeaders(request);

  const fetchOptions: RequestInit = {
    method,
    headers,
    // Retirado timeout fixo para deixar o Next.js gerenciar o limite da função
    // signal: AbortSignal.timeout(10000),
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

  const startTime = Date.now();
  try {
    const response = await fetch(backendUrl, fetchOptions);
    const duration = Date.now() - startTime;

    // Log apenas em desenvolvimento
    if ((process.env.NODE_ENV as string) !== 'production') {
      console.log(`[Proxy] ${method} ${parsedPath} → ${response.status} (${duration}ms)`);
      
      const setCookieHeaders = (response.headers as any).getSetCookie?.() ?? [];
      if (setCookieHeaders.length > 0) {
        console.log(`[Proxy]   Set-Cookie: ${setCookieHeaders.length} cookies relaying...`);
      }

      if (response.status === 401) {
        const cookieHeader = headers['cookie'] || headers['Cookie'] || '';
        console.log(`[Proxy]   401 detectado — cookie presente: ${cookieHeader.includes('lz_session')}`);
      }
    }

    const { data, isFile } = await parseBackendResponse(response);
    return buildProxyResponse(response, data, isFile);
  } catch (error: any) {
    // Log de erro apenas em desenvolvimento
    if ((process.env.NODE_ENV as string) !== 'production') {
      if (error.name === 'AbortError') {
        console.error(`[Proxy] Timeout na requisição (${method} ${backendUrl})`);
      } else {
        console.error(`[Proxy] Erro na requisição (${method} ${backendUrl}):`, error.message);
      }
    }
    
    // Tentar porta alternativa em desenvolvimento se a primeira falhar
    if ((process.env.NODE_ENV as string) !== 'production' && !process.env.BACKEND_URL) {
      const fallbackPort = '8788';
      const fallbackUrl = backendUrl.replace(':8787', `:${fallbackPort}`);
      try {
        if ((process.env.NODE_ENV as string) !== 'production') {
          console.log(`Tentando porta fallback ${fallbackPort}...`);
        }
        const response = await fetch(fallbackUrl, fetchOptions);
        const { data, isFile } = await parseBackendResponse(response);
        return buildProxyResponse(response, data, isFile);
      } catch (fallbackError: any) {
        if ((process.env.NODE_ENV as string) !== 'production') {
          console.error(`Fallback error:`, fallbackError?.message || fallbackError);
        }
      }
    }

    return NextResponse.json(
      { error: 'Não foi possível conectar ao backend. Verifique se o comando "npm run dev" foi executado na pasta backend.' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: any }) {
  return proxyRequest(request, params, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: any }) {
  return proxyRequest(request, params, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: any }) {
  return proxyRequest(request, params, 'PUT');
}

export async function PATCH(request: NextRequest, { params }: { params: any }) {
  return proxyRequest(request, params, 'PATCH');
}

export async function DELETE(request: NextRequest, { params }: { params: any }) {
  return proxyRequest(request, params, 'DELETE');
}
