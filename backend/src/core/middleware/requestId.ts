import { Context, Next } from 'hono';

/**
 * Middleware que adiciona um ID único de requisição a cada requisição recebida.
 * Usa o header x-request-id do cliente se presente, caso contrário gera um novo UUID.
 * O ID é armazenado no contexto e adicionado aos headers de resposta para rastreabilidade.
 *
 * Implicações de segurança/observabilidade:
 * - Facilita rastreamento distribuído entre serviços
 * - Ajuda a correlacionar logs da mesma requisição em múltiplos sistemas
 * - IDs fornecidos pelo cliente são aceitos (útil para rastreamento de requisições do frontend)
 *
 * @param {Context} c - O contexto Hono
 * @param {Next} next - A próxima função middleware na cadeia
 * @returns {Promise<void>} Resolve quando o próximo middleware completar
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  // Gera um ID único para a requisição
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();

  // Armazena no contexto para uso em outros middlewares/rotas
  (c as any).set('requestId', requestId);

  // Adiciona o header na resposta para o cliente
  c.res.headers.set('x-request-id', requestId);

  await next();
}
