/**
 * Cache distribuído expandido para Cloudflare Workers.
 * Inclui cache de sessão, consultas complexas, relatórios e métricas avançadas.
 */

const cache = new Map();
const sessionCache = new Map();
const queryCache = new Map();
const reportCache = new Map();

const MAX_CACHE_SIZE = 500;
const MAX_SESSION_CACHE_SIZE = 1000;
const MAX_QUERY_CACHE_SIZE = 200;
const MAX_REPORT_CACHE_SIZE = 50;

// Métricas de cache expandidas
const metrics = { 
  hits: 0, 
  misses: 0, 
  sets: 0, 
  invalidations: 0,
  sessionHits: 0,
  sessionMisses: 0,
  queryHits: 0,
  queryMisses: 0,
  reportHits: 0,
  reportMisses: 0,
  evictions: 0
};

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
    sessionSize: sessionCache.size,
    querySize: queryCache.size,
    reportSize: reportCache.size,
    hitRate: metrics.hits + metrics.misses > 0
      ? (metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1) + '%'
      : 'N/A',
    sessionHitRate: metrics.sessionHits + metrics.sessionMisses > 0
      ? (metrics.sessionHits / (metrics.sessionHits + metrics.sessionMisses) * 100).toFixed(1) + '%'
      : 'N/A',
    queryHitRate: metrics.queryHits + metrics.queryMisses > 0
      ? (metrics.queryHits / (metrics.queryHits + metrics.queryMisses) * 100).toFixed(1) + '%'
      : 'N/A',
    reportHitRate: metrics.reportHits + metrics.reportMisses > 0
      ? (metrics.reportHits / (metrics.reportHits + metrics.reportMisses) * 100).toFixed(1) + '%'
      : 'N/A',
  }),

  // Cache de Sessão
  getSession: (sessionId) => {
    const entry = sessionCache.get(sessionId);
    if (!entry) {
      metrics.sessionMisses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      sessionCache.delete(sessionId);
      metrics.sessionMisses++;
      return null;
    }

    metrics.sessionHits++;
    return entry.value;
  },

  setSession: (sessionId, sessionData, ttlSeconds = 3600) => {
    // Evict expired sessions when cache is full
    if (sessionCache.size >= MAX_SESSION_CACHE_SIZE && !sessionCache.has(sessionId)) {
      const now = Date.now();
      for (const [k, v] of sessionCache.entries()) {
        if (now > v.expiry) sessionCache.delete(k);
        if (sessionCache.size < MAX_SESSION_CACHE_SIZE) break;
      }
      // If still full, delete the oldest session
      if (sessionCache.size >= MAX_SESSION_CACHE_SIZE) {
        const oldest = sessionCache.keys().next().value;
        sessionCache.delete(oldest);
        metrics.evictions++;
      }
    }

    sessionCache.set(sessionId, {
      value: sessionData,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  deleteSession: (sessionId) => {
    sessionCache.delete(sessionId);
  },

  // Cache de Consultas Complexas
  getQuery: (queryKey) => {
    const entry = queryCache.get(queryKey);
    if (!entry) {
      metrics.queryMisses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      queryCache.delete(queryKey);
      metrics.queryMisses++;
      return null;
    }

    metrics.queryHits++;
    return entry.value;
  },

  setQuery: (queryKey, queryResult, ttlSeconds = 300) => {
    // Evict expired queries when cache is full
    if (queryCache.size >= MAX_QUERY_CACHE_SIZE && !queryCache.has(queryKey)) {
      const now = Date.now();
      for (const [k, v] of queryCache.entries()) {
        if (now > v.expiry) queryCache.delete(k);
        if (queryCache.size < MAX_QUERY_CACHE_SIZE) break;
      }
      // If still full, delete the oldest query
      if (queryCache.size >= MAX_QUERY_CACHE_SIZE) {
        const oldest = queryCache.keys().next().value;
        queryCache.delete(oldest);
        metrics.evictions++;
      }
    }

    queryCache.set(queryKey, {
      value: queryResult,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  deleteQuery: (queryKey) => {
    queryCache.delete(queryKey);
  },

  // Cache de Relatórios
  getReport: (reportKey) => {
    const entry = reportCache.get(reportKey);
    if (!entry) {
      metrics.reportMisses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      reportCache.delete(reportKey);
      metrics.reportMisses++;
      return null;
    }

    metrics.reportHits++;
    return entry.value;
  },

  setReport: (reportKey, reportData, ttlSeconds = 1800) => {
    // Evict expired reports when cache is full
    if (reportCache.size >= MAX_REPORT_CACHE_SIZE && !reportCache.has(reportKey)) {
      const now = Date.now();
      for (const [k, v] of reportCache.entries()) {
        if (now > v.expiry) reportCache.delete(k);
        if (reportCache.size < MAX_REPORT_CACHE_SIZE) break;
      }
      // If still full, delete the oldest report
      if (reportCache.size >= MAX_REPORT_CACHE_SIZE) {
        const oldest = reportCache.keys().next().value;
        reportCache.delete(oldest);
        metrics.evictions++;
      }
    }

    reportCache.set(reportKey, {
      value: reportData,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  deleteReport: (reportKey) => {
    reportCache.delete(reportKey);
  },

  // Limpeza de caches específicos
  clearSessions: () => {
    sessionCache.clear();
  },

  clearQueries: () => {
    queryCache.clear();
  },

  clearReports: () => {
    reportCache.clear();
  },

  // Limpeza total
  clearAll: () => {
    cache.clear();
    sessionCache.clear();
    queryCache.clear();
    reportCache.clear();
  },

  // Invalidação por padrão para todos os caches
  invalidateAllByPrefix: (prefix) => {
    let count = 0;
    
    // Cache principal
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
        count++;
      }
    }
    
    // Cache de sessão
    for (const key of sessionCache.keys()) {
      if (key.startsWith(prefix)) {
        sessionCache.delete(key);
        count++;
      }
    }
    
    // Cache de consultas
    for (const key of queryCache.keys()) {
      if (key.startsWith(prefix)) {
        queryCache.delete(key);
        count++;
      }
    }
    
    // Cache de relatórios
    for (const key of reportCache.keys()) {
      if (key.startsWith(prefix)) {
        reportCache.delete(key);
        count++;
      }
    }
    
    metrics.invalidations += count;
    return count;
  },

  // Estatísticas detalhadas
  getDetailedStats: () => ({
    mainCache: {
      size: cache.size,
      maxSize: MAX_CACHE_SIZE,
      hitRate: metrics.hits + metrics.misses > 0
        ? (metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1) + '%'
        : 'N/A',
    },
    sessionCache: {
      size: sessionCache.size,
      maxSize: MAX_SESSION_CACHE_SIZE,
      hitRate: metrics.sessionHits + metrics.sessionMisses > 0
        ? (metrics.sessionHits / (metrics.sessionHits + metrics.sessionMisses) * 100).toFixed(1) + '%'
        : 'N/A',
    },
    queryCache: {
      size: queryCache.size,
      maxSize: MAX_QUERY_CACHE_SIZE,
      hitRate: metrics.queryHits + metrics.queryMisses > 0
        ? (metrics.queryHits / (metrics.queryHits + metrics.queryMisses) * 100).toFixed(1) + '%'
        : 'N/A',
    },
    reportCache: {
      size: reportCache.size,
      maxSize: MAX_REPORT_CACHE_SIZE,
      hitRate: metrics.reportHits + metrics.reportMisses > 0
        ? (metrics.reportHits / (metrics.reportHits + metrics.reportMisses) * 100).toFixed(1) + '%'
        : 'N/A',
    },
    metrics: {
      ...metrics,
      totalSize: cache.size + sessionCache.size + queryCache.size + reportCache.size,
      totalMaxSize: MAX_CACHE_SIZE + MAX_SESSION_CACHE_SIZE + MAX_QUERY_CACHE_SIZE + MAX_REPORT_CACHE_SIZE,
    },
  }),
};
