import { describe, expect, it, beforeEach } from '@jest/globals';
import { cacheService } from '../src/modules/system/cacheService';

describe('Cache Service', () => {
  beforeEach(() => {
    cacheService.clear();
    cacheService.resetMetrics();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cacheService.set('test-key', { data: 'value' }, 60);
      const result = cacheService.get('test-key');
      expect(result).toEqual({ data: 'value' });
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired keys', async () => {
      cacheService.set('expire-key', 'value', 0.01); // 10ms
      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = cacheService.get('expire-key');
      expect(result).toBeNull();
    });

    it('should delete keys', () => {
      cacheService.set('delete-me', 'value', 60);
      cacheService.delete('delete-me');
      expect(cacheService.get('delete-me')).toBeNull();
    });
  });

  describe('Prefix Invalidation', () => {
    it('should invalidate all keys with a given prefix', () => {
      cacheService.set('catalog_page1', 'data1', 60);
      cacheService.set('catalog_page2', 'data2', 60);
      cacheService.set('other_key', 'data3', 60);

      const count = cacheService.invalidateByPrefix('catalog_');

      expect(count).toBe(2);
      expect(cacheService.get('catalog_page1')).toBeNull();
      expect(cacheService.get('catalog_page2')).toBeNull();
      expect(cacheService.get('other_key')).toBe('data3');
    });

    it('should return 0 when no keys match prefix', () => {
      cacheService.set('some_key', 'value', 60);
      const count = cacheService.invalidateByPrefix('nonexistent_');
      expect(count).toBe(0);
    });
  });

  describe('Metrics', () => {
    it('should track hits and misses', () => {
      cacheService.set('key1', 'value1', 60);
      cacheService.get('key1'); // hit
      cacheService.get('key2'); // miss
      cacheService.get('key1'); // hit

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

    it('should track invalidations', () => {
      cacheService.set('catalog_1', 'data', 60);
      cacheService.set('catalog_2', 'data', 60);
      cacheService.invalidateByPrefix('catalog_');

      const metrics = cacheService.getMetrics();
      expect(metrics.invalidations).toBe(2);
    });

    it('should calculate hit rate', () => {
      cacheService.set('key1', 'value1', 60);
      cacheService.get('key1'); // hit
      cacheService.get('key2'); // miss

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
