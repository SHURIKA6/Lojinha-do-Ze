/**
 * Cache simples em memória para Cloudflare Workers.
 * Nota: Cada isolado tem sua própria memória, portanto isso é por isolado.
 */

const cache = new Map();

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
