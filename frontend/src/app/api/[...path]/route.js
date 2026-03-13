export const runtime = 'nodejs';

const DEFAULT_LOCAL_PROXY_BASE = 'http://localhost:8787/api';

function normalizeProxyBase(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  // Accept either an origin (https://worker.example.com) or an API base (https://worker.example.com/api).
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

function resolveProxyBase() {
  const configured =
    process.env.API_PROXY_BASE ||
    // Common mistake: defining it as a public env var in Vercel/Next settings.
    process.env.NEXT_PUBLIC_API_PROXY_BASE ||
    '';

  if (configured) {
    return normalizeProxyBase(configured);
  }

  // Local development default (wrangler dev)
  if (process.env.NODE_ENV !== 'production') {
    return DEFAULT_LOCAL_PROXY_BASE;
  }

  return '';
}

function buildTargetUrl(base, requestUrl, pathSegments) {
  const url = new URL(requestUrl);
  const joinedPath = Array.isArray(pathSegments) ? pathSegments.join('/') : '';
  const target = joinedPath ? `${base}/${joinedPath}` : base;

  return `${target}${url.search}`;
}

function buildForwardHeaders(requestHeaders) {
  const headers = new Headers();

  requestHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host') return;
    if (lower === 'connection') return;
    if (lower === 'content-length') return;
    headers.set(key, value);
  });

  return headers;
}

function jsonError(status, error, details) {
  const payload = details ? { error, details } : { error };
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function isValidAbsoluteUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

async function proxy(request, context) {
  const proxyBase = resolveProxyBase();
  if (!proxyBase) {
    console.error('[api-proxy] Missing API_PROXY_BASE (or NEXT_PUBLIC_API_PROXY_BASE).');
    return jsonError(
      500,
      'Backend não configurado. Defina API_PROXY_BASE no ambiente (ex.: Vercel) apontando para o Worker.'
    );
  }

  if (!isValidAbsoluteUrl(proxyBase)) {
    console.error('[api-proxy] Invalid API proxy base:', proxyBase);
    return jsonError(
      500,
      'Backend não configurado corretamente. Verifique se API_PROXY_BASE é uma URL absoluta (https://...) apontando para o Worker.'
    );
  }

  const targetUrl = buildTargetUrl(proxyBase, request.url, context?.params?.path);
  const method = request.method.toUpperCase();
  const headers = buildForwardHeaders(request.headers);

  const init = {
    method,
    headers,
    redirect: 'manual',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    const buffer = await request.arrayBuffer();
    init.body = buffer.byteLength ? buffer : undefined;
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    console.error('[api-proxy] Upstream fetch failed:', {
      targetUrl,
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError(
      502,
      'Não foi possível conectar ao backend. Verifique se o Worker está online e se API_PROXY_BASE está correto.'
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : upstream.headers.get('set-cookie')
        ? [upstream.headers.get('set-cookie')]
        : [];

  if (setCookies.length) {
    responseHeaders.delete('set-cookie');
    for (const cookie of setCookies) {
      responseHeaders.append('set-cookie', cookie);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export function GET(request, context) {
  return proxy(request, context);
}

export function POST(request, context) {
  return proxy(request, context);
}

export function PUT(request, context) {
  return proxy(request, context);
}

export function PATCH(request, context) {
  return proxy(request, context);
}

export function DELETE(request, context) {
  return proxy(request, context);
}

export function OPTIONS(request, context) {
  return proxy(request, context);
}

export function HEAD(request, context) {
  return proxy(request, context);
}
