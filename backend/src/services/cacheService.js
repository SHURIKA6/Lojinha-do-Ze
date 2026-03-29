/**
 * Cache simples em memória para Cloudflare Workers.
 * Nota: Cada isolado tem sua própria memória, portanto isso é por isolado.
 * Inclui métricas de hit/miss e invalidação por prefixo.
 */

const cache = new Map();
const MAX_CACHE_SIZE = 500;

// Métricas de cache
const metrics = { hits: 0, misses: 0, sets: 0, invalidations: 0 };

export const cacheService = {
  get: (key) => {
    const entry = cache.get(key);
    if (!entry) {
      metrics.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      cache.delete(key);
      metrics.misses++;
      return null;
    }

    metrics.hits++;
    return entry.value;
  },

  set: (key, value, ttlSeconds = 60) => {
    // Evict expired or oldest entries when cache is full
    if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now > v.expiry) cache.delete(k);
        if (cache.size < MAX_CACHE_SIZE) break;
      }
      // If still full, delete the oldest entry (first inserted)
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
      }
    }

    metrics.sets++;
    cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  delete: (key) => {
    cache.delete(key);
  },

  /**
   * Invalida todas as entradas que começam com o prefixo informado.
   * Útil para invalidar caches de catálogo quando produtos são modificados.
   */
  invalidateByPrefix: (prefix) => {
    let count = 0;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
        count++;
      }
    }
    metrics.invalidations += count;
    return count;
  },

  clear: () => {
    cache.clear();
  },

  /** Reseta as métricas (útil para testes). */
  resetMetrics: () => {
    metrics.hits = 0;
    metrics.misses = 0;
    metrics.sets = 0;
    metrics.invalidations = 0;
  },

  /** Retorna métricas de uso do cache (útil para health check e debugging). */
  getMetrics: () => ({
    ...metrics,
    size: cache.size,
    hitRate: metrics.hits + metrics.misses > 0
      ? (metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1) + '%'
      : 'N/A',
  }),
};
