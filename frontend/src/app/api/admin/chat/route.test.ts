/** @jest-environment node */

import { NextRequest } from 'next/server';

describe('admin chat proxy route', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BACKEND_URL = 'https://backend.example/';
  });

  afterEach(() => {
    delete process.env.BACKEND_URL;
    jest.restoreAllMocks();
  });

  it('uses BACKEND_URL, forwards cookies, and preserves backend status and payload', async () => {
    const backendPayload = {
      error: 'A sabedoria da IA está temporariamente indisponível.',
      details: { status: 'upstream-error' },
    };
    const backendResponse = new Response(JSON.stringify(backendPayload), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(backendResponse as any);
    const { POST } = await import('./route');

    const request = new NextRequest(
      'https://lojinha-do-ze.vercel.app/api/admin/chat',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'lz_session=abc; lz_csrf=def',
        },
        body: JSON.stringify({ message: 'teste' }),
      }
    );

    const response = await POST(request);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example/api/admin/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Cookie: 'lz_session=abc; lz_csrf=def',
        }),
        body: JSON.stringify({ message: 'teste' }),
      })
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(backendPayload);
  });
});
