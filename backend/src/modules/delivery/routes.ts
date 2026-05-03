import { Hono } from 'hono';
import { DeliveryLocationDO } from './locationDO';

/**
 * Módulo de Rotas de Entrega
 * Gerencia rotas HTTP para rastreamento de localização de entrega via Durable Objects.
 * Fornece endpoints para atualizar localização de entrega, recuperar localização atual,
 * e estabelecer conexões WebSocket para atualizações de localização em tempo real.
 */

const router = new Hono<{ Bindings: any }>();

/**
 * POST /update
 * Atualiza a localização de entrega para um pedido específico.
 * @param c - O contexto do Hono contendo o parâmetro orderId e corpo da requisição com coordenadas lat/lng
 * @returns Resposta do Durable Object indicando sucesso ou falha
 */
router.post('/update', async (c) => {
  const orderId = c.req.param('orderId');
  const id = c.env.DELIVERY_LOCATION_DO.idFromName(orderId);
  const stub = c.env.DELIVERY_LOCATION_DO.get(id);
  
  const body = await c.req.json();
  return await stub.fetch(new Request(`http://internal/update`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

/**
 * GET /location
 * Recupera a localização atual de entrega para um pedido específico.
 * @param c - O contexto do Hono contendo o parâmetro orderId
 * @returns Resposta contendo as coordenadas lat/lng atuais e o timestamp da atualização
 */
router.get('/location', async (c) => {
  const orderId = c.req.param('orderId');
  const id = c.env.DELIVERY_LOCATION_DO.idFromName(orderId);
  const stub = c.env.DELIVERY_LOCATION_DO.get(id);
  
  return await stub.fetch(new Request(`http://internal/location`));
});

/**
 * GET /ws
 * Estabelece uma conexão WebSocket para atualizações de localização de entrega em tempo real.
 * @param c - O contexto do Hono contendo o parâmetro orderId e requisição de upgrade WebSocket
 * @returns Resposta WebSocket que transmite atualizações de localização para o cliente
 */
router.get('/ws', async (c) => {
  const orderId = c.req.param('orderId');
  const id = c.env.DELIVERY_LOCATION_DO.idFromName(orderId);
  const stub = c.env.DELIVERY_LOCATION_DO.get(id);
  
  return await stub.fetch(c.req.raw);
});

export default router;
