// Rate limiter distribuído usando Cloudflare Workers KV.
// Quando KV está disponível (produção), o estado é compartilhado entre todos os edge nodes.
// Quando KV não está disponível (desenvolvimento local), usa Map() em memória como fallback.

import { Context, Next } from 'hono';
import { logger } from '../utils/logger';
import { Bindings } from '../types';

interface RateLimitState {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  get(key: string): Promise<RateLimitState | null>;
  put(key: string, value: RateLimitState, ttlMs: number, waitUntil?: (p: Promise<any>) => void): Promise<void>;
}

// ---------- Fallback em memória (apenas para dev local) ----------

function createInMemoryStore(): RateLimitStore {
  const map = new Map<string, RateLimitState>();

  return {
    async get(key: string) {
      const state = map.get(key);
      if (!state) return null;
      if (Date.now() > state.resetAt) {
        map.delete(key);
        return null;
      }
      return state;
    },
    async put(key: string, value: RateLimitState, _ttlMs: number) {
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

function createKvStore(kvNamespace: KVNamespace): RateLimitStore {
  return {
    async get(key: string) {
      try {
        const raw = await kvNamespace.get(key, 'json') as RateLimitState | null;
        if (!raw) return null;
        if (Date.now() > raw.resetAt) return null;
        return raw;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        logger.warn('KV rate-limit get falhou, permitindo request', { key, error: errorMessage });
        return null;
      }
    },
    async put(key: string, value: RateLimitState, ttlMs: number, waitUntil?: (p: Promise<any>) => void) {
      const putOp = async () => {
        try {
          // expirationTtl é em segundos e mínimo 60s no KV
          const ttlSeconds = Math.max(Math.ceil(ttlMs / 1000), 60);
          await kvNamespace.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          // Se for erro de quota (429), logamos apenas uma vez ou com menos frequência
          logger.warn(`KV rate-limit put falhou: ${errorMessage}`, { key });
        }
      };

      if (waitUntil) {
        waitUntil(putOp());
      } else {
        await putOp();
      }
    },
  };
}

// ---------- Factory do rate limiter ----------

const fallbackStore = createInMemoryStore();

export function createRateLimiter(namespace: string, limit: number, windowMs: number, options: { skipKV?: boolean } = {}) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const skipKV = options.skipKV || false;
    const kvBinding = !skipKV ? (c.env?.CACHE_KV as KVNamespace | undefined) : undefined;
    const store = kvBinding ? createKvStore(kvBinding) : fallbackStore;

    // Confia apenas no IP do cliente fornecido pela plataforma.
    const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
    const key = `rl:${namespace}:${ip}`;
    const now = Date.now();

    const state = await store.get(key);
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);

    if (!state) {
      const newState = { count: 1, resetAt: now + windowMs };
      await store.put(key, newState, windowMs, waitUntil);
    } else {
      state.count++;
      if (state.count > limit) {
        logger.info(`Rate limit atingido: ${namespace} para ${ip}`);
        return c.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, 429);
      }
      await store.put(key, state, state.resetAt - now, waitUntil);
    }

    return await next();
  };
}

export const loginLimiter = createRateLimiter('login', 5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
export const setupPasswordLimiter = createRateLimiter('setup', 5, 15 * 60 * 1000); // 5 tentativas de configuração a cada 15 minutos
export const orderLimiter = createRateLimiter('order', 10, 60 * 60 * 1000); // 10 pedidos por 1 hora
export const profileLimiter = createRateLimiter('profile', 10, 5 * 60 * 1000); // 10 atualizações de perfil por 5 minutos
export const customerActionLimiter = createRateLimiter('customer_action', 30, 60 * 1000); // 30 ações em clientes por minuto (admin)

// O apiLimiter é global e causava estouro do limite de KV (1000 PUTs/dia).
// Agora ele é configurado para usar APENAS o storage em memória para economizar PUTs.
export const apiLimiter = createRateLimiter('api', 100, 60 * 1000, { skipKV: true });
