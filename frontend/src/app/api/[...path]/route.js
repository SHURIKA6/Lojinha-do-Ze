export const runtime = 'nodejs';

function getProxyBase() {
  const configured = process.env.API_PROXY_BASE;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, '');
  }

  // Local development default (wrangler dev)
  return 'http://localhost:8787/api';
}

function buildTargetUrl(requestUrl, pathSegments) {
  const base = getProxyBase();
  const url = new URL(requestUrl);
  const joinedPath = Array.isArray(pathSegments) ? pathSegments.join('/') : '';
  const target = `${base}/${joinedPath}`;

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

async function proxy(request, context) {
  const targetUrl = buildTargetUrl(request.url, context?.params?.path);
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

  const upstream = await fetch(targetUrl, init);

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

