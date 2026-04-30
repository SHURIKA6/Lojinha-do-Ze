/**
 * Cache distribuído expandido para Cloudflare Workers.
 * Inclui cache de sessão, consultas complexas, relatórios e métricas avançadas.
 * Suporta Cloudflare KV para persistência e escalabilidade.
 */

interface CacheEntry {
  value: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const sessionCache = new Map<string, CacheEntry>();
const queryCache = new Map<string, CacheEntry>();
const reportCache = new Map<string, CacheEntry>();

const MAX_CACHE_SIZE = 500;
const MAX_SESSION_CACHE_SIZE = 1000;
const MAX_QUERY_CACHE_SIZE = 200;
const MAX_REPORT_CACHE_SIZE = 50;

import { logger } from '../../core/utils/logger';
import { Bindings, HonoCloudflareContext } from '../../core/types';

type KVNamespace = Bindings['CACHE_KV'];
type ExecutionContext = HonoCloudflareContext['executionCtx'];

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
  get: async (key: string, kv?: KVNamespace, ctx?: ExecutionContext) => {
    const entry = cache.get(key);
    if (entry) {
      if (Date.now() > entry.expiry) {
        cache.delete(key);
        metrics.misses++;
      } else {
        metrics.hits++;
        return entry.value;
      }
    }

    if (kv) {
      try {
        const value = await kv.get(key, { type: 'json' });
        if (value) {
          metrics.hits++;
          // Populate L1 (1 min TTL)
          cache.set(key, { value, expiry: Date.now() + 60000 });
          return value;
        }
      } catch (e) {
        logger.error(`Erro ao ler do KV: ${key}`, e as Error);
      }
    }

    metrics.misses++;
    return null;
  },

  set: async (key: string, value: any, ttlSeconds = 60, kv?: KVNamespace, ctx?: ExecutionContext) => {
    if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now > v.expiry) cache.delete(k);
        if (cache.size < MAX_CACHE_SIZE) break;
      }
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
    }

    metrics.sets++;
    cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    if (kv) {
      const putOp = async () => {
        try {
          await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
        } catch (e) {
          logger.error(`Erro ao escrever no KV: ${key}`, e as Error);
        }
      };

      // Se tivermos acesso ao executionCtx, usamos waitUntil para garantir a escrita sem bloquear
      if (ctx?.waitUntil) {
        ctx.waitUntil(putOp());
      } else {
        putOp().catch(err => logger.error(`Erro assíncrono no KV set: ${key}`, err));
      }
    }
  },

  delete: async (key: string, kv?: KVNamespace, ctx?: ExecutionContext) => {
    cache.delete(key);
    if (kv) {
      const delOp = async () => {
        try {
          await kv.delete(key);
        } catch (e) {
          logger.error(`Erro ao deletar do KV: ${key}`, e as Error);
        }
      };

      if (ctx?.waitUntil) {
        ctx.waitUntil(delOp());
      } else {
        delOp().catch(err => logger.error(`Erro assíncrono no KV delete: ${key}`, err));
      }
    }
  },

  invalidateByPrefix: async (prefix: string, _kv?: KVNamespace, _ctx?: ExecutionContext) => {
    let count = 0;
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
        count++;
      }
    }
    // KV invalidation by prefix requires listing, which is omitted for performance here.
    // L1 is invalidated, KV will expire by TTL or eventually be overwritten.
    metrics.invalidations += count;
    return count;
  },

  clear: () => {
    cache.clear();
  },

  getMetrics: () => ({
    ...metrics,
    size: cache.size,
    sessionSize: sessionCache.size,
    querySize: queryCache.size,
    reportSize: reportCache.size,
    hitRate: metrics.hits + metrics.misses > 0
      ? (metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1) + '%'
      : 'N/A',
  }),

  // Cache de Sessão (Também async para consistência)
  getSession: async (sessionId: string, kv?: KVNamespace, ctx?: ExecutionContext) => {
    const entry = sessionCache.get(sessionId);
    if (entry) {
      if (Date.now() > entry.expiry) {
        sessionCache.delete(sessionId);
        metrics.sessionMisses++;
      } else {
        metrics.sessionHits++;
        return entry.value;
      }
    }

    if (kv) {
      const val = await kv.get(`session:${sessionId}`, { type: 'json' });
      if (val) {
        metrics.sessionHits++;
        sessionCache.set(sessionId, { value: val, expiry: Date.now() + 300000 }); // 5 min L1
        return val;
      }
    }

    metrics.sessionMisses++;
    return null;
  },

  setSession: async (sessionId: string, sessionData: any, ttlSeconds = 3600, kv?: KVNamespace, ctx?: ExecutionContext) => {
    if (sessionCache.size >= MAX_SESSION_CACHE_SIZE && !sessionCache.has(sessionId)) {
      const now = Date.now();
      for (const [k, v] of sessionCache.entries()) {
        if (now > v.expiry) sessionCache.delete(k);
        if (sessionCache.size < MAX_SESSION_CACHE_SIZE) break;
      }
      if (sessionCache.size >= MAX_SESSION_CACHE_SIZE) {
        const oldest = sessionCache.keys().next().value;
        if (oldest) sessionCache.delete(oldest);
      }
    }

    sessionCache.set(sessionId, {
      value: sessionData,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    if (kv) {
      const putOp = async () => {
        try {
          await kv.put(`session:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: ttlSeconds });
        } catch (e) {
          logger.error(`Erro ao escrever sessão no KV: ${sessionId}`, e as Error);
        }
      };
      if (ctx?.waitUntil) {
        ctx.waitUntil(putOp());
      } else {
        putOp().catch(err => logger.error(`Erro assíncrono no KV setSession: ${sessionId}`, err));
      }
    }
  },

  deleteSession: async (sessionId: string, kv?: KVNamespace, ctx?: ExecutionContext) => {
    sessionCache.delete(sessionId);
    if (kv) {
      const delOp = async () => {
        try {
          await kv.delete(`session:${sessionId}`);
        } catch (e) {
          logger.error(`Erro ao deletar sessão do KV: ${sessionId}`, e as Error);
        }
      };

      if (ctx?.waitUntil) {
        ctx.waitUntil(delOp());
      } else {
        delOp().catch(err => logger.error(`Erro assíncrono no KV deleteSession: ${sessionId}`, err));
      }
    }
  },

  // Cache de Consultas Complexas
  getQuery: async (queryKey: string) => {
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

  setQuery: async (queryKey: string, queryResult: any, ttlSeconds = 300) => {
    if (queryCache.size >= MAX_QUERY_CACHE_SIZE && !queryCache.has(queryKey)) {
      const oldest = queryCache.keys().next().value;
      if (oldest) queryCache.delete(oldest);
    }
    queryCache.set(queryKey, {
      value: queryResult,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  // Cache de Relatórios
  getReport: async (reportKey: string) => {
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

  setReport: async (reportKey: string, reportData: any, ttlSeconds = 1800) => {
    if (reportCache.size >= MAX_REPORT_CACHE_SIZE && !reportCache.has(reportKey)) {
      const oldest = reportCache.keys().next().value;
      if (oldest) reportCache.delete(oldest);
    }
    reportCache.set(reportKey, {
      value: reportData,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  clearAll: () => {
    cache.clear();
    sessionCache.clear();
    queryCache.clear();
    reportCache.clear();
  },

  getDetailedStats: () => ({
    mainCache: { size: cache.size, hitRate: metrics.hits + metrics.misses > 0 ? (metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1) + '%' : 'N/A' },
    sessionCache: { size: sessionCache.size, hitRate: metrics.sessionHits + metrics.sessionMisses > 0 ? (metrics.sessionHits / (metrics.sessionHits + metrics.sessionMisses) * 100).toFixed(1) + '%' : 'N/A' },
    metrics: { ...metrics },
  }),
};
