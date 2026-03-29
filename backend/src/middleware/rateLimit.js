// Rate limiter distribuído usando Cloudflare Workers KV.
// Quando KV está disponível (produção), o estado é compartilhado entre todos os edge nodes.
// Quando KV não está disponível (desenvolvimento local), usa Map() em memória como fallback.

import { logger } from '../utils/logger.js';

// ---------- Fallback em memória (apenas para dev local) ----------

function createInMemoryStore() {
  const map = new Map();

  return {
    async get(key) {
      const state = map.get(key);
      if (!state) return null;
      if (Date.now() > state.resetAt) {
        map.delete(key);
        return null;
      }
      return state;
    },
    async put(key, value, _ttlMs) {
      map.set(key, value);
      // Evita vazamento de memória em isolados de longa duração
      if (map.size > 5000) {
        const now = Date.now();
        for (const [k, v] of map.entries()) {
          if (now > v.resetAt) map.delete(k);
        }
      }
    },
  };
}

// ---------- Store distribuído via KV ----------

function createKvStore(kvNamespace) {
  return {
    async get(key) {
      try {
        const raw = await kvNamespace.get(key, 'json');
        if (!raw) return null;
        if (Date.now() > raw.resetAt) return null;
        return raw;
      } catch (err) {
        logger.warn('KV rate-limit get falhou, permitindo request', { key, error: err?.message });
        return null;
      }
    },
    async put(key, value, ttlMs) {
      try {
        // expirationTtl é em segundos e mínimo 60s no KV
        const ttlSeconds = Math.max(Math.ceil(ttlMs / 1000), 60);
        await kvNamespace.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
      } catch (err) {
        logger.warn('KV rate-limit put falhou', { key, error: err?.message });
      }
    },
  };
}

// ---------- Factory do rate limiter ----------

const fallbackStore = createInMemoryStore();

export function createRateLimiter(namespace, limit, windowMs) {
  return async (c, next) => {
    const kvBinding = c.env?.RATE_LIMIT_KV;
    const store = kvBinding ? createKvStore(kvBinding) : fallbackStore;

    // Confia apenas no IP do cliente fornecido pela plataforma.
    const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
    const key = `rl:${namespace}:${ip}`;
    const now = Date.now();

    const state = await store.get(key);

    if (!state) {
      await store.put(key, { count: 1, resetAt: now + windowMs }, windowMs);
    } else {
      state.count++;
      if (state.count > limit) {
        return c.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, 429);
      }
      await store.put(key, state, state.resetAt - now);
    }

    await next();
  };
}

export const loginLimiter = createRateLimiter('login', 5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
export const setupPasswordLimiter = createRateLimiter('setup', 5, 15 * 60 * 1000); // 5 tentativas de configuração a cada 15 minutos
export const orderLimiter = createRateLimiter('order', 10, 60 * 60 * 1000); // 10 pedidos por 1 hora
export const apiLimiter = createRateLimiter('api', 60, 60 * 1000); // 60 requisições por minuto
