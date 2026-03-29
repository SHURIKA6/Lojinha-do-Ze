/**
 * Middleware para adicionar um ID único a cada requisição.
 * Facilita rastreamento de logs e debugging em produção.
 */

export async function requestIdMiddleware(c, next) {
  // Gera um ID único para a requisição
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();

  // Armazena no contexto para uso em outros middlewares/rotas
  c.set('requestId', requestId);

  // Adiciona o header na resposta para o cliente
  c.res.headers.set('x-request-id', requestId);

  await next();
}