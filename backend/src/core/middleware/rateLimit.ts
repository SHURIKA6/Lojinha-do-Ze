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

/**
 * Cria um armazenamento de rate limit em memória usando Map.
 * Este armazenamento é destinado apenas para desenvolvimento local e não persiste entre workers.
 * Inclui limpeza automática para evitar vazamento de memória em processos de longa dução.
 *
 * @returns {RateLimitStore} Um armazenamento de rate limit apoiado por um Map em memória
 */
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

/**
 * Cria um armazenamento distribuído de rate limit apoiado por Cloudflare Workers KV.
 * Este armazenamento persiste o estado de rate limit em todos os edge nodes em produção.
 * Falhas em operações KV são registradas mas não bloqueiam requisições (estratégia fail-open).
 *
 * Nota de segurança: KV tem um TTL mínimo de 60 segundos. Janelas de rate limit menores
 * que 60 segundos serão arredondadas para 60 segundos no armazenamento KV.
 *
 * @param {KVNamespace} kvNamespace - O binding do namespace Cloudflare KV para armazenar o estado de rate limit
 * @returns {RateLimitStore} Um armazenamento de rate limit apoiado por Cloudflare KV
 */
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

/**
 * Cria um middleware de rate limiter para Hono.
 * Rastreia a contagem de requisições por endereço IP dentro de uma janela deslizante.
 *
 * Implicações de segurança:
 * - Usa o header cf-connecting-ip (confiável no ambiente Cloudflare) para identificar clientes
 * - Implementa estratégia fail-open: se a leitura do armazenamento falhar, a requisição é permitida
 * - Armazenamento em memória (skipKV: true) não compartilha estado entre workers/regiões
 * - Armazenamento KV fornece rate limiting distribuído mas consome quota de escrita KV
 *
 * @param {string} namespace - Um identificador único para este rate limiter (ex: 'login', 'api')
 * @param {number} limit - Número máximo de requisições permitidas dentro da janela
 * @param {number} windowMs - A janela de tempo em milissegundos para o rate limiting
 * @param {Object} [options] - Configuração opcional
 * @param {boolean} [options.skipKV=false] - Quando true, força o uso de armazenamento em memória em vez de KV (economiza quota KV)
 * @returns {(c: Context<{ Bindings: Bindings }>, next: Next) => Promise<void>} Uma função middleware Hono
 */
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
    let waitUntil: ((p: Promise<any>) => void) | undefined;
    try {
      waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    } catch {
      // executionCtx not available (not in Cloudflare Workers environment)
    }

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

/**
 * Rate limiter para tentativas de login.
 * Limita a 5 tentativas por 15 minutos por IP.
 * Protege contra ataques de força bruta em credenciais.
 */
export const loginLimiter = createRateLimiter('login', 5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
/**
 * Rate limiter para tentativas de configuração/recuperação de senha.
 * Limita a 5 tentativas por 15 minutos por IP.
 * Protege contra abuso da funcionalidade de redefinição de senha.
 */
export const setupPasswordLimiter = createRateLimiter('setup', 5, 15 * 60 * 1000); // 5 tentativas de configuração a cada 15 minutos
/**
 * Rate limiter para criação de pedidos.
 * Limita a 10 pedidos por hora por IP.
 * Previne spam de pedidos em massa e potencial abuso de inventário.
 */
export const orderLimiter = createRateLimiter('order', 10, 60 * 60 * 1000); // 10 pedidos por 1 hora
/**
 * Rate limiter para atualizações de perfil.
 * Limita a 10 atualizações por 5 minutos por IP.
 * Protege contra enumeração de perfis e ataques de modificação rápida.
 */
export const profileLimiter = createRateLimiter('profile', 10, 5 * 60 * 1000); // 10 atualizações de perfil por 5 minutos
/**
 * Rate limiter para ações administrativas relacionadas a clientes.
 * Limita a 30 ações por minuto por IP.
 * Protege contra abuso de ações administrativas e operações em massa.
 */
export const customerActionLimiter = createRateLimiter('customer_action', 30, 60 * 1000); // 30 ações em clientes por minuto (admin)

// O apiLimiter é global e causava estouro do limite de KV (1000 PUTs/dia).
// Agora ele é configurado para usar APENAS o storage em memória para economizar PUTs.

/**
 * Rate limiter global da API.
 * Limita a 100 requisições por minuto por IP.
 * Usa apenas armazenamento em memória (skipKV: true) para conservar quota de escrita KV.
 * Este limiter NÃO compartilha estado entre edge nodes da Cloudflare.
 */
export const apiLimiter = createRateLimiter('api', 100, 60 * 1000, { skipKV: true });
