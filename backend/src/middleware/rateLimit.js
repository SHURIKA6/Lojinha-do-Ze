// Lógica de limitador de taxa (rate limiter) em memória
// Como as Cloudflare Workers rodam em ambientes isolados, esta memória é por isolado.
// Para um limitador totalmente global, deve-se usar o Rate Limiter pago da Cloudflare ou Redis/KV.
// No entanto, isso fornece uma base MVP sólida contra ataques de força bruta no mesmo nó de borda (edge node).

const loginMap = new Map();
const setupPasswordMap = new Map();
const orderMap = new Map();

const apiMap = new Map();

export function createRateLimiter(store, limit, windowMs) {
  return async (c, next) => {
    // Confia apenas no IP do cliente fornecido pela plataforma.
    const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
    const now = Date.now();
    
    if (!store.has(ip)) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
    } else {
      const state = store.get(ip);
      if (now > state.resetAt) {
        state.count = 1;
        state.resetAt = now + windowMs;
      } else {
        state.count++;
        if (state.count > limit) {
          return c.json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, 429);
        }
      }
    }
    
    // Evita vazamentos de memória em isolados de longa duração sem descartar todas as proteções.
    if (store.size > 5000) {
      for (const [key, state] of store.entries()) {
        if (now > state.resetAt) {
          store.delete(key);
        }
      }
    }
    
    await next();
  };
}

export const loginLimiter = createRateLimiter(loginMap, 5, 15 * 60 * 1000); // 5 tentativas a cada 15 minutos
export const setupPasswordLimiter = createRateLimiter(setupPasswordMap, 5, 15 * 60 * 1000); // 5 tentativas de configuração a cada 15 minutos
export const orderLimiter = createRateLimiter(orderMap, 10, 60 * 60 * 1000); // 10 pedidos por 1 hora
export const apiLimiter = createRateLimiter(apiMap, 60, 60 * 1000); // 60 requisições por minuto
