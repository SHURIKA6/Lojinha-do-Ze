/** @jest-environment node */

import { NextRequest } from 'next/server';

describe('middleware fetchMe', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.BACKEND_URL = 'https://backend.example/';
  });

  afterEach(() => {
    delete process.env.BACKEND_URL;
    jest.restoreAllMocks();
  });

  it('resolves auth/me from BACKEND_URL', async () => {
    const payload = {
      user: {
        id: 'user_1',
        role: 'admin',
        email: 'admin@lojinha-do-ze.com',
      },
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }) as any
      );
    const { fetchMe } = await import('./middleware');

    const request = new NextRequest(
      'https://lojinha-do-ze.vercel.app/admin/dashboard',
      {
        headers: {
          cookie: 'lz_session=abc',
        },
      }
    );

    await expect(fetchMe(request)).resolves.toEqual({
      kind: 'auth',
      user: payload.user,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example/api/auth/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          cookie: 'lz_session=abc',
        }),
        cache: 'no-store',
      })
    );
  });
});
