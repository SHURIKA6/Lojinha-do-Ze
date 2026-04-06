/** @jest-environment node */

import { NextRequest } from 'next/server';

describe('API proxy route', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BACKEND_URL = 'https://backend.example';
  });

  afterEach(() => {
    delete process.env.BACKEND_URL;
    jest.restoreAllMocks();
  });

  it('streama respostas binárias e preserva headers seguros', async () => {
    const backendResponse = new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
        ETag: '"img-1"',
        'Set-Cookie': 'lz_session=abc; Path=/; HttpOnly',
      },
    });

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(backendResponse as any);
    const { GET } = await import('./route');

    const request = new NextRequest(
      'https://lojinha-do-ze.vercel.app/api/upload/products/test.png',
      {
        headers: {
          accept: 'image/png',
          cookie: 'lz_session=abc',
          origin: 'https://lojinha-do-ze.vercel.app',
          'sec-fetch-mode': 'cors',
          'x-forwarded-host': 'evil.example',
        },
      }
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ['upload', 'products', 'test.png'] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example/api/upload/products/test.png',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      })
    );

    const forwardedHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(forwardedHeaders.get('origin')).toBe('https://lojinha-do-ze.vercel.app');
    expect(forwardedHeaders.get('x-forwarded-host')).toBeNull();

    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(response.headers.get('etag')).toBe('"img-1"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
});
