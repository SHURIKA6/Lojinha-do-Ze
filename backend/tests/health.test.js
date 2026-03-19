import { describe, expect, it } from '@jest/globals';
import app from '../src/server.js';

describe('Health Check API', () => {
  it('should return a 200 OK status', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', message: 'Lojinha do Zé API' });
  });
});
