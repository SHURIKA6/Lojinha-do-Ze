import { Context, Next } from 'hono';
import { logger } from '../utils/logger';

// ---------- Interfaces ----------

interface RateLimitState {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  get(key: string): Promise<RateLimitState | null>;
  put(key: string, value: RateLimitState, ttlMs: number): Promise<void>;
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

function createKvStore(kvNamespace: any): RateLimitStore {
  return {
    async get(key: string) {
      try {
        const raw = await kvNamespace.get(key, { type: 'json' });
        if (!raw) return null;
        if (Date.now() > (raw as RateLimitState).resetAt) return null;
        return raw as RateLimitState;
      } catch (err: any) {
        logger.warn('KV rate-limit get falhou, permitindo request', { key, error: err?.message });
        return null;
      }
    },
    async put(key: string, value: RateLimitState, ttlMs: number) {
      try {
        // expirationTtl é em segundos e mínimo 60s no KV
        const ttlSeconds = Math.max(Math.ceil(ttlMs / 1000), 60);
        await kvNamespace.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
      } catch (err: any) {
        logger.warn('KV rate-limit put falhou', { key, error: err?.message });
      }
    },
  };
}

// ---------- Factory do rate limiter ----------

const fallbackStore = createInMemoryStore();

export function createRateLimiter(namespace: string, limit: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const kvBinding = (c.env as any)?.RATE_LIMIT_KV;
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
