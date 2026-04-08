/** @jest-environment node */

describe('backend URL helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.BACKEND_URL;
  });

  afterEach(() => {
    delete process.env.BACKEND_URL;
  });

  it('builds API URLs from BACKEND_URL and trims trailing slashes', async () => {
    process.env.BACKEND_URL = 'https://backend.example///';

    const { buildBackendApiUrl, getBackendOrigin } = await import('./backend-url');

    expect(getBackendOrigin()).toBe('https://backend.example');
    expect(buildBackendApiUrl('/admin/chat')).toBe(
      'https://backend.example/api/admin/chat'
    );
  });

  it('throws a clear error when BACKEND_URL is missing', async () => {
    const { buildBackendApiUrl } = await import('./backend-url');

    expect(() => buildBackendApiUrl('/admin/chat')).toThrow(
      'BACKEND_URL is required'
    );
  });

  it('rejects BACKEND_URL values that already include /api', async () => {
    process.env.BACKEND_URL = 'https://backend.example/api';

    const { buildBackendApiUrl } = await import('./backend-url');

    expect(() => buildBackendApiUrl('/admin/chat')).toThrow(
      'BACKEND_URL must not include /api'
    );
  });
});
