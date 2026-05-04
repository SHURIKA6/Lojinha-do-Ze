import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { pixPaymentSchema } from '../../core/domain/schemas';
import { MercadoPagoService } from './service';
import { getRequiredEnv } from '../../core/load-local-env';
import { jsonError, validationError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { orderLimiter } from '../../core/middleware/rateLimit';
import { normalizePhoneDigits } from '../../core/utils/normalize';
import { Bindings, Variables } from '../../core/types';
import * as orderService from '../orders/service';
import { logSystemEvent } from '../system/logService';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Factory function que cria uma instância do serviço Mercado Pago.
 * 
 * Esta função obtém o token de acesso das variáveis de ambiente e
 * instancia o serviço MercadoPagoService configurado para o ambiente atual.
 * 
 * @param c - Contexto do Hono contendo as variáveis de ambiente
 * 
 * @returns Instância configurada de MercadoPagoService pronta para uso
 */
const getService = (c: any) => {
  const token = getRequiredEnv(c, 'MERCADO_PAGO_ACCESS_TOKEN');
  return new MercadoPagoService(token);
};

/**
 * Verifica a assinatura de um webhook do Mercado Pago.
 * 
 * Esta função implementa a validação de segurança dos webhooks recebidos
 * pelo Mercado Pago. A validação é feita através de HMAC-SHA256:
 * 
 * 1. Extrai o timestamp (ts) e a assinatura (v1) do header x-signature
 * 2. Constrói o manifesto no formato: id:{dataId};request-id:{xRequestId};ts:{ts};
 * 3. Gera o HMAC-SHA256 do manifesto usando o webhook secret
 * 4. Compara a assinatura gerada com a recebida no header
 * 
 * @param c - Contexto do Hono contendo os headers da requisição
 * @param dataId - ID do recurso (pagamento) que disparou o webhook
 * 
 * @returns {Promise<boolean>} true se a assinatura for válida, false caso contrário.
 *                            Retorna false também se o webhook secret não estiver configurado.
 */
async function verifyWebhookSignature(c: any, dataId: string) {
  const webhookSecret = c.env?.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('MERCADO_PAGO_WEBHOOK_SECRET não configurado — webhook rejeitado');
    return false;
  }

  const xSignature = c.req.header('x-signature');
  const xRequestId = c.req.header('x-request-id');

  if (!xSignature || !xRequestId) {
    return false;
  }

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(',')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key && valueParts.length) {
      parts[key.trim()] = valueParts.join('=').trim();
    }
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const expected = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');

  return expected === v1;
}

/**
 * Rota POST /pix
 * 
 * Cria um novo pagamento PIX para um pedido existente.
 * 
 * Fluxo:
 * 1. Valida os dados de entrada usando o schema pixPaymentSchema
 * 2. Verifica se o pedido existe e se não possui pagamento vinculado
 * 3. Valida se o telefone do payload confere com o telefone do pedido
 * 4. Cria o pagamento no Mercado Pago via serviço
 * 5. Atualiza o pedido com o ID do pagamento e status inicial
 * 6. Retorna os dados do pagamento (QR Code, etc.) para o cliente
 * 
 * Rate limiting: Esta rota possui limite de requisições via orderLimiter.
 * 
 * Body: { orderId, email, firstName, lastName, identificationNumber, phone }
 * Response: { id, status, qr_code, qr_code_base64, ticket_url, ... }
 */
router.post('/pix', orderLimiter, zValidator('json', pixPaymentSchema, validationError), async (c) => {
  const db = c.get('db');
  const payload = c.req.valid('json') as any;
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      `SELECT id, total, customer_name, customer_id, customer_phone, payment_id
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [payload.orderId]
    );

    if (!orderRows.length) {
      return jsonError(c, 404, 'Pedido não encontrado');
    }

    const order = orderRows[0];

    if (order.payment_id) {
      await client.query('ROLLBACK');
      return jsonError(c, 409, 'Já existe um pagamento vinculado a este pedido');
    }

    const user = c.get('user');
    if (user && order.customer_id && String(order.customer_id) !== String(user.id)) {
      await client.query('ROLLBACK');
      return jsonError(c, 403, 'Acesso negado a este pedido');
    }

    const normalizedOrderPhone = normalizePhoneDigits(order.customer_phone || '');
    const normalizedPayloadPhone = normalizePhoneDigits(payload.phone);
    if (!normalizedOrderPhone || normalizedOrderPhone !== normalizedPayloadPhone) {
      await client.query('ROLLBACK');
      return jsonError(c, 403, 'Os dados do pedido não conferem para criar o pagamento');
    }

    const service = getService(c);

    const payment = await service.createPixPayment({
      transaction_amount: Number(order.total),
      description: `Pedido #${order.id} - Lojinha do Zé`,
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      identification_number: payload.identificationNumber,
      external_reference: String(order.id),
      idempotencyKey: `order-pix-${order.id}`,
    });

    await client.query(
      'UPDATE orders SET payment_id = $1, payment_status = $2 WHERE id = $3',
      [payment.id, payment.status, order.id]
    );

    await client.query('COMMIT');
    return c.json(payment, 201);
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    const errorId = crypto.randomUUID().split('-')[0];
    const isConfigError = error.message?.includes('não definido');
    
    logger.error(`Erro ao processar pagamento Pix [${errorId}]`, error, { 
      orderId: payload.orderId,
      email: payload.email,
      isConfigError,
    });

    await logSystemEvent(db, c.env, 'error', `Falha no Pagamento Pix [${errorId}]: ${error.message}`, {
      orderId: payload.orderId,
      email: payload.email,
      errorId
    }, error).catch(err => logger.error('Falha ao logar erro de pagamento no banco', err));

    if (isConfigError) {
      return jsonError(c, 503, 'Serviço de pagamento não configurado. Entre em contato com o administrador.', { errorId });
    }

    return jsonError(c, 500, 'Erro ao criar pagamento no Mercado Pago', { errorId });
  } finally {
    if (client.release) client.release();
  }
});

/**
 * Rota GET /pix/:id
 * 
 * Consulta o status de um pagamento PIX específico.
 * 
 * Fluxo:
 * 1. Valida se o paymentId e orderId são numéricos válidos
 * 2. Verifica se o pedido existe
 * 3. Valida se o telefone informado confere com o telefone do pedido
 * 4. Consulta o status atual no Mercado Pago
 * 5. Verifica se o pagamento pertence ao pedido informado (via external_reference)
 * 6. Retorna o status e detalhes do pagamento
 * 
 * Query params: orderId (obrigatório), phone (obrigatório para validação)
 * Response: { id, status, status_detail, external_reference }
 */
router.get('/pix/:id', async (c) => {
  const db = c.get('db');
  const paymentId = c.req.param('id');
  const orderId = c.req.query('orderId');
  const phone = c.req.query('phone') || '';

  if (!/^\d+$/.test(paymentId)) {
    return jsonError(c, 400, 'ID de pagamento inválido');
  }

  if (!/^\d+$/.test(orderId || '')) {
    return jsonError(c, 400, 'ID de pedido inválido');
  }

  const { rows } = await db.query(
    `SELECT id, customer_id, customer_phone
     FROM orders
     WHERE id = $1`,
    [orderId]
  );
  if (!rows.length) {
    return jsonError(c, 404, 'Pedido não encontrado');
  }

  const order = rows[0];
  const user = c.get('user');
  if (user && order.customer_id && String(order.customer_id) !== String(user.id)) {
    return jsonError(c, 403, 'Acesso negado a este pedido');
  }

  const normalizedOrderPhone = normalizePhoneDigits(order.customer_phone || '');
  const normalizedRequestPhone = normalizePhoneDigits(phone);
  if (!normalizedOrderPhone || normalizedOrderPhone !== normalizedRequestPhone) {
    return jsonError(c, 403, 'Os dados do pedido não conferem para consultar o pagamento');
  }

  const service = getService(c);

  try {
    const payment = await service.getPayment(paymentId);
    if (String(payment.external_reference || '') !== String(orderId)) {
      return jsonError(c, 403, 'Pagamento não corresponde ao pedido informado');
    }

    return c.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
    });
  } catch (error: any) {
    const errorId = crypto.randomUUID().split('-')[0];
    logger.error(`Erro ao buscar status do pagamento [${errorId}]`, error, { paymentId, orderId });

    await logSystemEvent(db, c.env, 'error', `Erro Consulta Pagamento [${errorId}]: ${error.message}`, {
      paymentId,
      orderId,
      errorId
    }, error).catch(err => logger.error('Falha ao logar erro de consulta de pagamento no banco', err));

    return jsonError(c, 500, 'Erro ao buscar status do pagamento', { errorId });
  }
});

/**
 * Rota POST /webhook
 * 
 * Recebe e processa notificações de webhook do Mercado Pago.
 * 
 * Este endpoint é chamado pelo Mercado Pago quando o status de um pagamento
 * é alterado. O fluxo de processamento:
 * 
 * 1. Valida o tamanho do payload (máximo 64KB)
 * 2. Verifica a assinatura do webhook para garantir autenticidade
 * 3. Extrai o ID do pagamento e o tipo de notificação (topic)
 * 4. Se for notificação de pagamento (topic = 'payment'):
 *    a. Consulta os detalhes do pagamento no Mercado Pago
 *    b. Identifica o pedido via external_reference
 *    c. Atualiza o status do pagamento no banco de dados
 *    d. Se aprovado: atualiza status do pedido para 'pago', cria transação financeira
 *    e. Se cancelado/rejeitado: atualiza status do pedido para 'cancelado'
 * 
 * Segurança: Todas as notificações são validadas via assinatura HMAC-SHA256.
 * Idempotência: Verifica se já existe transação para evitar duplicidade.
 * 
 * Headers esperados: x-signature, x-request-id
 * Body: { data: { id }, topic, type, resource }
 * Response: "OK" (200) sempre, mesmo em caso de erro interno (para evitar retry do MP)
 */
router.post('/webhook', async (c) => {
  const contentLength = parseInt(c.req.header('content-length') || '0', 10);
  if (contentLength > 65536) {
    return c.text('Payload Too Large', 413);
  }

  const body = await c.req.json() as any;
  const db = c.get('db');

  const dataId = body.data?.id || '';

  const isValid = await verifyWebhookSignature(c, String(dataId));
  if (!isValid) {
    logger.warn('Webhook do Mercado Pago rejeitado: assinatura inválida', {
      headers: {
        'x-signature': c.req.header('x-signature') ? '[presente]' : '[ausente]',
        'x-request-id': c.req.header('x-request-id') ? '[presente]' : '[ausente]',
      },
    });
    return c.text('Unauthorized', 401);
  }

  const resource = body.resource || dataId;
  const topic = body.topic || body.type;

  if (topic === 'payment' && resource) {
    try {
      const service = getService(c);
      const paymentId = String(resource).split('/').pop() || resource;
      const payment = await service.getPayment(paymentId);
      const orderId = payment.external_reference;

      if (orderId) {
        const { rows: orderCheck } = await db.query(
          'SELECT id, payment_id FROM orders WHERE id = $1',
          [orderId]
        );

        if (!orderCheck.length) {
          logger.warn('Webhook: pagamento referencia pedido inexistente', {
            paymentId,
            orderId,
          });
          return c.text('OK', 200);
        }

        const existingPaymentId = orderCheck[0].payment_id;
        if (existingPaymentId && String(existingPaymentId) !== String(payment.id)) {
          logger.warn('Webhook: payment_id não corresponde ao pedido', {
            paymentId: payment.id,
            existingPaymentId,
            orderId,
          });
          return c.text('OK', 200);
        }

        await db.query(
          'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
          [payment.status, orderId]
        );

        if (payment.status === 'approved') {
          // Atualiza o status do pedido de forma completa (incluindo WhatsApp e Log de estoque se necessário)
          await orderService.updateOrderStatus(db, orderId, 'pago', c.env);
          
          // Verificamos se já existe transação para evitar duplicidade
          const { rows: txCheck } = await db.query('SELECT id FROM transactions WHERE order_id = $1', [orderId]);
          if (!txCheck.length) {
            const { rows: orderData } = await db.query('SELECT total, customer_name FROM orders WHERE id = $1', [orderId]);
            if (orderData.length) {
              await db.query(
                `INSERT INTO transactions (type, category, description, value, date, order_id)
                 VALUES ($1, $2, $3, $4, NOW(), $5)`,
                [
                  'receita',
                  'Venda de produtos (PIX)',
                  `Pedido #${orderId} - ${orderData[0].customer_name}`,
                  orderData[0].total,
                  orderId,
                ]
              );
            }
          }
        } else if (payment.status === 'cancelled' || payment.status === 'rejected') {
          await orderService.updateOrderStatus(db, orderId, 'cancelado', c.env);
        }
      }
    } catch (error: any) {
      const errorId = crypto.randomUUID().split('-')[0];
      logger.error(`Erro ao processar webhook do Mercado Pago [${errorId}]`, error, {
        topic,
        resource: String(resource),
      });

      await logSystemEvent(db, c.env, 'error', `Erro Webhook Mercado Pago [${errorId}]: ${error.message}`, {
        topic,
        resource: String(resource),
        errorId
      }, error).catch(err => logger.error('Falha ao logar erro de webhook no banco', err));
    }
  }

  return c.text('OK', 200);
});

export default router;
