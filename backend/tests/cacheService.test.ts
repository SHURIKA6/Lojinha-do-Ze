import { describe, expect, it, beforeEach } from '@jest/globals';
import { cacheService } from '../src/modules/system/cacheService';

describe('Cache Service', () => {
  beforeEach(() => {
    cacheService.clear();
    cacheService.resetMetrics();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await cacheService.set('test-key', { data: 'value' }, 60);
      const result = await cacheService.get('test-key');
      expect(result).toEqual({ data: 'value' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired keys', async () => {
      await cacheService.set('expire-key', 'value', 0.01); // 10ms
      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = await cacheService.get('expire-key');
      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      await cacheService.set('delete-me', 'value', 60);
      await cacheService.delete('delete-me');
      expect(await cacheService.get('delete-me')).toBeNull();
    });
  });

  describe('Prefix Invalidation', () => {
    it('should invalidate all keys with a given prefix', async () => {
      await cacheService.set('catalog_page1', 'data1', 60);
      await cacheService.set('catalog_page2', 'data2', 60);
      await cacheService.set('other_key', 'data3', 60);

      const count = await cacheService.invalidateByPrefix('catalog_');

      expect(count).toBe(2);
      expect(await cacheService.get('catalog_page1')).toBeNull();
      expect(await cacheService.get('catalog_page2')).toBeNull();
      expect(await cacheService.get('other_key')).toBe('data3');
    });

    it('should return 0 when no keys match prefix', async () => {
      await cacheService.set('some_key', 'value', 60);
      const count = await cacheService.invalidateByPrefix('nonexistent_');
      expect(count).toBe(0);
    });
  });

  describe('Metrics', () => {
    it('should track hits and misses', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.get('key1'); // hit
      await cacheService.get('key2'); // miss
      await cacheService.get('key1'); // hit

      const metrics = cacheService.getMetrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
    });

    it('should track sets', () => {
      cacheService.set('key1', 'value1', 60);
      cacheService.set('key2', 'value2', 60);

      const metrics = cacheService.getMetrics();
      expect(metrics.sets).toBe(2);
    });

    it('should track invalidations', async () => {
      await cacheService.set('catalog_1', 'data', 60);
      await cacheService.set('catalog_2', 'data', 60);
      await cacheService.invalidateByPrefix('catalog_');

      const metrics = cacheService.getMetrics();
      expect(metrics.invalidations).toBe(2);
    });

    it('should calculate hit rate', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.get('key1'); // hit
      await cacheService.get('key2'); // miss

      const metrics = cacheService.getMetrics();
      expect(metrics.hitRate).toBe('50.0%');
    });

    it('should return N/A for hit rate when no requests', () => {
      const metrics = cacheService.getMetrics();
      expect(metrics.hitRate).toBe('N/A');
    });

    it('should track cache size', () => {
      cacheService.set('key1', 'value1', 60);
      cacheService.set('key2', 'value2', 60);

      const metrics = cacheService.getMetrics();
      expect(metrics.size).toBe(2);
    });
  });
});
