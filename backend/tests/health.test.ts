import { describe, expect, it } from '@jest/globals';
import app from '../src/server';

describe('Health Check API', () => {
  it('should return a 200 OK status', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    
    const body = await res.json() as any;
    expect(body.status).toBe('ok');
    expect(body.message).toBe('Lojinha do Zé API');
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.cache).toBeDefined();
  });
});
