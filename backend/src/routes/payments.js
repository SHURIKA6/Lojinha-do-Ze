import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { pixPaymentSchema } from '../domain/schemas.js';
import { MercadoPagoService } from '../services/mercadoPagoService.js';
import { getRequiredEnv } from '../load-local-env.js';
import { jsonError, validationError } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { orderLimiter } from '../middleware/rateLimit.js';

const router = new Hono();

// Instancia o serviço usando a variável de ambiente
const getService = (c) => {
  const token = getRequiredEnv(c, 'MERCADO_PAGO_ACCESS_TOKEN');
  return new MercadoPagoService(token);
};

/**
 * Verifica a assinatura HMAC do webhook do Mercado Pago.
 * Retorna true se a assinatura for válida ou se o secret não estiver configurado (dev).
 */
async function verifyWebhookSignature(c, dataId) {
  const webhookSecret = c.env?.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('MERCADO_PAGO_WEBHOOK_SECRET não configurado — webhook aceito sem verificação');
    return true;
  }

  const xSignature = c.req.header('x-signature');
  const xRequestId = c.req.header('x-request-id');

  if (!xSignature || !xRequestId) {
    return false;
  }

  // Extrair ts e v1 do header "ts=...,v1=..."
  const parts = {};
  for (const part of xSignature.split(',')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key && valueParts.length) {
      parts[key.trim()] = valueParts.join('=').trim();
    }
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // Gerar manifest string conforme documentação do Mercado Pago
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
 * Cria um pagamento via Pix para um pedido existente.
 * Protegido com rate limiter para prevenir abuso.
 */
router.post('/pix', orderLimiter, zValidator('json', pixPaymentSchema, validationError), async (c) => {
  const db = c.get('db');
  const payload = c.req.valid('json');
  
  try {
    // 1. Busca o pedido para validar o valor e ownership
    const { rows: orderRows } = await db.query(
      'SELECT id, total, customer_name, customer_id, payment_id FROM orders WHERE id = $1',
      [payload.orderId]
    );

    if (!orderRows.length) {
      return jsonError(c, 404, 'Pedido não encontrado');
    }

    const order = orderRows[0];

    // SEC-02: Verifica se já existe pagamento vinculado ao pedido
    if (order.payment_id) {
      return jsonError(c, 409, 'Já existe um pagamento vinculado a este pedido');
    }

    // SEC-02: Se há um usuário autenticado, verifica ownership
    const user = c.get('user');
    if (user && order.customer_id && String(order.customer_id) !== String(user.id)) {
      return jsonError(c, 403, 'Acesso negado a este pedido');
    }

    const service = getService(c);

    // 2. Cria o pagamento no Mercado Pago
    // SEC-06: Idempotency key estável baseada apenas no orderId
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

    // 3. Salva o ID do pagamento no pedido para referência futura
    await db.query(
      'UPDATE orders SET payment_id = $1, payment_status = $2 WHERE id = $3',
      [payment.id, payment.status, order.id]
    );

    return c.json(payment, 201);
  } catch (error) {
    logger.error('Erro ao processar pagamento Pix', error);
    return jsonError(c, 500, 'Erro ao criar pagamento no Mercado Pago');
  }
});

/**
 * Verifica o status de um pagamento específico (Polling do Frontend)
 */
router.get('/pix/:id', async (c) => {
  const paymentId = c.req.param('id');

  // Validação básica do ID
  if (!/^\d+$/.test(paymentId)) {
    return jsonError(c, 400, 'ID de pagamento inválido');
  }

  const service = getService(c);

  try {
    const payment = await service.getPayment(paymentId);
    return c.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
    });
  } catch {
    return jsonError(c, 500, 'Erro ao buscar status do pagamento');
  }
});

/**
 * Webhook para notificações do Mercado Pago.
 * SEC-01: Verifica assinatura HMAC quando o secret está configurado.
 */
router.post('/webhook', async (c) => {
  const body = await c.req.json();
  const db = c.get('db');

  // ID do recurso para verificação de assinatura
  const dataId = body.data?.id || '';

  // SEC-01: Verificar assinatura HMAC do Mercado Pago
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

  // O Mercado Pago envia notificações com 'type' ou no campo 'action'
  const resource = body.resource || dataId;
  const topic = body.topic || body.type;

  if (topic === 'payment' && resource) {
    try {
      const service = getService(c);
      const paymentId = String(resource).split('/').pop() || resource;
      const payment = await service.getPayment(paymentId);
      const orderId = payment.external_reference;

      if (orderId) {
        // 1. Atualiza o status do pagamento no pedido (sempre)
        await db.query(
          'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
          [payment.status, orderId]
        );

        // 2. Se o pagamento foi aprovado, atualiza o status do pedido para 'recebido'
        if (payment.status === 'approved') {
          const client = await db.connect();
          try {
            await client.query('BEGIN');

            // Busca o pedido para garantir que ainda está como 'novo'
            const { rows } = await client.query(
              'SELECT total, status, customer_name FROM orders WHERE id = $1 FOR UPDATE',
              [orderId]
            );

            if (rows.length && rows[0].status === 'novo') {
              const order = rows[0];

              await client.query('UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1', [
                orderId,
                'recebido',
              ]);

              await client.query(
                `INSERT INTO transactions (type, category, description, value, date, order_id)
                 VALUES ($1, $2, $3, $4, NOW(), $5)`,
                [
                  'receita',
                  'Venda de produtos (PIX)',
                  `Pedido #${orderId} - ${order.customer_name}`,
                  order.total,
                  orderId,
                ]
              );
            }

            await client.query('COMMIT');
          } catch (e) {
            await client.query('ROLLBACK');
            throw e;
          } finally {
            client.release();
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao processar webhook do Mercado Pago', error, {
        topic,
        resource: String(resource),
      });
    }
  }

  // Sempre retorna 200 para o Mercado Pago não reenviar
  return c.text('OK', 200);
});

export default router;
