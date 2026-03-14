// In-memory rate limiter logic
// Because Cloudflare Workers run in isolated environments, this memory is per-isolate.
// For a fully global rate limiter, Cloudflare's Paid Rate Limiter or Redis/KV should be used.
// However, this provides a solid base MVP against brute-forces on the same edge node.

const loginMap = new Map();
const setupPasswordMap = new Map();
const orderMap = new Map();

export function createRateLimiter(store, limit, windowMs) {
  return async (c, next) => {
    // Trust only the platform-provided client IP.
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
    
    // Prevent memory leaks in long-lived isolates without dropping all protections.
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

export const loginLimiter = createRateLimiter(loginMap, 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const setupPasswordLimiter = createRateLimiter(setupPasswordMap, 5, 15 * 60 * 1000); // 5 setup attempts per 15 minutes
export const orderLimiter = createRateLimiter(orderMap, 10, 60 * 60 * 1000); // 10 orders per 1 hour
