import { Hono } from 'hono';

/**
 * Módulo de Rotas de Notificações
 * Gerencia rotas HTTP para o sistema de notificações usando Durable Objects.
 * Fornece endpoint WebSocket para notificações em tempo real e funcionalidade de broadcast.
 */

const router = new Hono<any>();

/**
 * GET /ws
 * Estabelece uma conexão WebSocket para notificações em tempo real.
 * Encaminha a requisição para o Notifications Durable Object para manipulação.
 * @param {any} c - O contexto do Hono contendo a requisição de upgrade WebSocket
 * @returns {Promise<Response>} Resposta WebSocket do Durable Object
 */
router.get('/ws', async (c) => {
  const id = c.env.NOTIFICATIONS_DO.idFromName("GLOBAL_NOTIFICATIONS");
  const stub = c.env.NOTIFICATIONS_DO.get(id);
  
  // Forward the WebSocket request to the Durable Object
  return stub.fetch(c.req.raw);
});

/**
 * POST /broadcast
 * Envia uma notificação de broadcast para todos os clientes conectados.
 * Encaminha a requisição de broadcast para o Notifications Durable Object.
 * @param {any} c - O contexto do Hono contendo a mensagem de notificação no corpo da requisição
 * @returns {Promise<Response>} Resposta JSON indicando sucesso
 */
router.post('/broadcast', async (c) => {
  const body = await c.req.json();
  const id = c.env.NOTIFICATIONS_DO.idFromName("GLOBAL_NOTIFICATIONS");
  const stub = c.env.NOTIFICATIONS_DO.get(id);
  
  await stub.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify(body)
  }));
  
  return c.json({ success: true });
});

export default router;
