import { describe, expect, it, jest } from '@jest/globals';
import { app } from '../src/server';
import { cacheService } from '../src/modules/system/cacheService';

describe('Security and Performance Integration', () => {
  describe('Audit Logging', () => {
    it('should pass through the audit middleware for POST requests', async () => {
      // We don't have a full DB setup for integration tests yet, 
      // but we can test that the middleware doesn't crash the request.
      // Since it's a POST to a non-existent route, it should 404 but pass through audit.
      const res = await app.request('/api/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      }, {
        DATABASE_URL: 'postgres://dummy:dummy@localhost:5432/dummy'
      });
      
      expect(res.status).toBe(404);
    });
  });

  describe('Caching Service', () => {
    it('should store and retrieve values', async () => {
      await cacheService.set('test_key', { data: 'passed' }, 10);
      expect(await cacheService.get('test_key')).toEqual({ data: 'passed' });
    });

    it('should return null for expired keys', async () => {
      jest.useFakeTimers();
      await cacheService.set('expire_key', 'value', 1);
      jest.advanceTimersByTime(2000);
      expect(await cacheService.get('expire_key')).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('File Signature Validation', () => {
    it('should validate correct PNG signature', async () => {
      const { validateFileSignature } = await import('../src/core/utils/file');
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
      expect(validateFileSignature(pngBuffer, 'png')).toBe(true);
    });

    it('should reject incorrect signature', async () => {
      const { validateFileSignature } = await import('../src/core/utils/file');
      const fakeBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer;
      expect(validateFileSignature(fakeBuffer, 'png')).toBe(false);
    });
  });
});
