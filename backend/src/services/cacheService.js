/**
 * Cache simples em memória para Cloudflare Workers.
 * Nota: Cada isolado tem sua própria memória, portanto isso é por isolado.
 */

const cache = new Map();
const MAX_CACHE_SIZE = 500;

export const cacheService = {
  get: (key) => {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }

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

    cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  delete: (key) => {
    cache.delete(key);
  },

  clear: () => {
    cache.clear();
  },
};
