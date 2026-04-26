import { describe, expect, it } from '@jest/globals';
import app from '../src/server';

describe('Health Check API', () => {
  it('should report degraded status when DATABASE_URL is absent in the request env', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(503);
    
    const body: any = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.message).toBe('Lojinha do Zé API');
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toEqual({ status: 'missing_config' });
    expect(body.checks.cache).toBeDefined();
  });
});
