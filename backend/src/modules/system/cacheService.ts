/**
 * Cache distribuído expandido para Cloudflare Workers.
 * Inclui cache de sessão, consultas complexas, relatórios e métricas avançadas.
 * Suporta Cloudflare KV para persistência e escalabilidade.
 */

// Debug: check if module is loaded multiple times
console.log('cacheService module loaded:', Math.random().toFixed(10));

/**
 * Representa uma entrada de cache com seu valor e timestamp de expiração.
 */
interface CacheEntry {
  value: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const sessionCache = new Map<string, CacheEntry>();
const queryCache = new Map<string, CacheEntry>();
const reportCache = new Map<string, CacheEntry>();

/** Número máximo de entradas no cache principal */
const MAX_CACHE_SIZE = 500;
/** Número máximo de entradas no cache de sessão */
const MAX_SESSION_CACHE_SIZE = 1000;
/** Número máximo de entradas no cache de consultas */
const MAX_QUERY_CACHE_SIZE = 200;
/** Número máximo de entradas no cache de relatórios */
const MAX_REPORT_CACHE_SIZE = 50;

import { logger } from '../../core/utils/logger';
import { Bindings, HonoCloudflareContext } from '../../core/types';

/** Apelido de tipo para o namespace KV do Cloudflare proveniente das bindings */
type KVNamespace = Bindings['CACHE_KV'];
/** Apelido de tipo para o ExecutionContext do Cloudflare proveniente do contexto Hono */
type ExecutionContext = HonoCloudflareContext['executionCtx'];

/** Métricas coletadas para operações de cache */
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

/**
 * Serviço de cache provendo cache multi-nível com suporte a L1 (em memória) e L2 (Cloudflare KV).
 * Suporta diferentes tipos de cache: geral, sessão, consulta e relatórios.
 * Inclui rastreamento de métricas para hits, misses e evicções.
 */
export const cacheService = {
  /**
   * Recupera um valor do cache pela chave.
   * Verifica primeiro o cache L1 (em memória), depois recorre ao KV se disponível.
   * @param key - A chave do cache a ser recuperada
   * @param kv - Namespace KV opcional do Cloudflare para cache L2
   * @param ctx - Contexto de execução opcional para operações assíncronas
   * @returns O valor em cache ou null se não encontrado/expirado
   */
  get: async (key: string, kv?: KVNamespace, ctx?: ExecutionContext) => {
    console.log('getSession called:', key, 'sessionCache.size before:', sessionCache.size);
    const entry = sessionCache.get(key);
    if (entry) {
      if (Date.now() > entry.expiry) {
        sessionCache.delete(key);
        metrics.misses++;
      } else {
        metrics.hits++;
        console.log('getSession found in cache:', key, 'value:', entry.value);
        return entry.value;
      }
    }

    if (kv) {
      try {
        const value = await kv.get(key, { type: 'json' });
        if (value) {
          metrics.hits++;
          // Populate L1 (1 min TTL)
          sessionCache.set(key, { value, expiry: Date.now() + 60000 });
          console.log('getSession found in KV:', key, 'value:', value);
          return value;
        }
      } catch (e) {
        logger.error(`Erro ao ler do KV: ${key}`, e as Error);
      }
    }

    metrics.misses++;
    console.log('getSession not found:', key);
    return null;
  },

  /**
   * Armazena um valor no cache com TTL opcional.
   * Gerencia evicção de cache quando o tamanho máximo é atingido.
   * Opcionalmente persiste no Cloudflare KV para cache distribuído.
   * @param key - A chave do cache
   * @param value - O valor a ser armazenado em cache
   * @param ttlSeconds - Tempo de vida em segundos (padrão: 60)
   * @param kv - Namespace KV opcional do Cloudflare para cache L2
   * @param ctx - Contexto de execução opcional para operações assíncronas
   */
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

  /**
   * Remove uma chave do cache (tanto L1 quanto opcionalmente L2/KV).
   * @param key - A chave do cache a ser removida
   * @param kv - Namespace KV opcional do Cloudflare
   * @param ctx - Contexto de execução opcional para operações assíncronas
   */
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

  /**
   * Invalida todas as entradas do cache com chaves começando com o prefixo informado.
   * Nota: Apenas o cache L1 é invalidado; entradas KV expiram pelo TTL.
   * @param prefix - O prefixo a ser correspondido para invalidação
   * @param _kv - Placeholder para namespace KV (não usado atualmente)
   * @param _ctx - Placeholder para contexto de execução (não usado atualmente)
   * @returns O número de entradas invalidadas
   */
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

  /**
   * Clears all entries from the main cache.
   */
  clear: () => {
    cache.clear();
  },

  /**
   * Retorna métricas atuais do cache incluindo hits, misses, tamanhos e taxas de acerto.
   * @returns Objeto contendo todas as métricas e tamanhos do cache
   */
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
  /**
   * Recupera uma sessão do cache de sessões.
   * Verifica primeiro o cache L1 de sessões, depois recorre ao KV.
   * @param sessionId - O identificador da sessão
   * @param kv - Namespace KV opcional do Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Os dados da sessão ou null se não encontrada/expirada
   */
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

  /**
   * Armazena dados de sessão no cache de sessões com TTL.
   * Gerencia evicção quando o cache de sessões atinge o tamanho máximo.
   * @param sessionId - O identificador da sessão
   * @param sessionData - Os dados da sessão a serem armazenados
   * @param ttlSeconds - Tempo de vida em segundos (padrão: 3600)
   * @param kv - Namespace KV opcional do Cloudflare
   * @param ctx - Contexto de execução opcional
   */
  setSession: async (sessionId: string, sessionData: any, ttlSeconds = 3600, kv?: KVNamespace, ctx?: ExecutionContext) => {
    console.log('setSession called:', sessionId, 'sessionCache.size before:', sessionCache.size);
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
    console.log('setSession after set:', sessionId, 'sessionCache.size after:', sessionCache.size);

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

  /**
   * Remove uma sessão tanto do cache L1 de sessões quanto do KV.
   * @param sessionId - O identificador da sessão a ser removida
   * @param kv - Namespace KV opcional do Cloudflare
   * @param ctx - Contexto de execução opcional
   */
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
  /**
   * Recupera um resultado de consulta em cache pela chave.
   * @param queryKey - A chave do cache de consulta
   * @returns O resultado da consulta em cache ou null se não encontrado/expirado
   */
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

  /**
   * Armazena um resultado de consulta em cache com TTL.
   * Remove a entrada mais antiga se o tamanho máximo do cache for atingido.
   * @param queryKey - A chave do cache de consulta
   * @param queryResult - O resultado da consulta a ser armazenado
   * @param ttlSeconds - Tempo de vida em segundos (padrão: 300)
   */
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
  /**
   * Recupera um relatório em cache pela chave.
   * Relatórios tipicamente têm TTL mais longo para operações custosas.
   * @param reportKey - A chave do cache de relatório
   * @returns Os dados do relatório em cache ou null se não encontrado/expirado
   */
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

  /**
   * Armazena um relatório em cache com TTL (padrão 30 minutos).
   * Remove a entrada mais antiga se o tamanho máximo do cache for atingido.
   * @param reportKey - A chave do cache de relatório
   * @param reportData - Os dados do relatório a serem armazenados
   * @param ttlSeconds - Tempo de vida em segundos (padrão: 1800)
   */
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

  /**
   * Limpa todas as entradas de cache de todos os tipos (principal, sessão, consulta, relatório).
   */
  clearAll: () => {
    cache.clear();
    sessionCache.clear();
    queryCache.clear();
    reportCache.clear();
  },

  /**
   * Reseta todas as métricas do cache para zero.
   */
  resetMetrics: () => {
    metrics.hits = 0;
    metrics.misses = 0;
    metrics.sets = 0;
    metrics.invalidations = 0;
    metrics.sessionHits = 0;
    metrics.sessionMisses = 0;
    metrics.queryHits = 0;
    metrics.queryMisses = 0;
    metrics.reportHits = 0;
    metrics.reportMisses = 0;
    metrics.evictions = 0;
  },

  /**
   * Retorna estatísticas detalhadas para todos os tipos de cache incluindo tamanhos e taxas de acerto.
   * @returns Objeto com estatísticas detalhadas do cache e métricas
   */
  getDetailedStats: () => ({
    mainCache: { size: cache.size, hitRate: metrics.hits + metrics.misses > 0 ? (metrics.hits / (metrics.hits + metrics.misses) * 100).toFixed(1) + '%' : 'N/A' },
    sessionCache: { size: sessionCache.size, hitRate: metrics.sessionHits + metrics.sessionMisses > 0 ? (metrics.sessionHits / (metrics.sessionHits + metrics.sessionMisses) * 100).toFixed(1) + '%' : 'N/A' },
    metrics: { ...metrics },
  }),
};
