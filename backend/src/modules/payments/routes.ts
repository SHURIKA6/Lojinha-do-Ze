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

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const getService = (c: any) => {
  const token = getRequiredEnv(c, 'MERCADO_PAGO_ACCESS_TOKEN');
  return new MercadoPagoService(token);
};

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

router.post('/pix', orderLimiter, zValidator('json', pixPaymentSchema, validationError), async (c) => {
  const db = c.get('db');
  const payload = c.req.valid('json') as any;
  
  try {
    const { rows: orderRows } = await db.query(
      `SELECT id, total, customer_name, customer_id, customer_phone, payment_id
       FROM orders
       WHERE id = $1`,
      [payload.orderId]
    );

    if (!orderRows.length) {
      return jsonError(c, 404, 'Pedido não encontrado');
    }

    const order = orderRows[0];

    if (order.payment_id) {
      return jsonError(c, 409, 'Já existe um pagamento vinculado a este pedido');
    }

    const user = c.get('user');
    if (user && order.customer_id && String(order.customer_id) !== String(user.id)) {
      return jsonError(c, 403, 'Acesso negado a este pedido');
    }

    const normalizedOrderPhone = normalizePhoneDigits(order.customer_phone || '');
    const normalizedPayloadPhone = normalizePhoneDigits(payload.phone);
    if (!normalizedOrderPhone || normalizedOrderPhone !== normalizedPayloadPhone) {
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

    await db.query(
      'UPDATE orders SET payment_id = $1, payment_status = $2 WHERE id = $3',
      [payment.id, payment.status, order.id]
    );

    return c.json(payment, 201);
  } catch (error) {
    logger.error('Erro ao processar pagamento Pix', error as Error);
    return jsonError(c, 500, 'Erro ao criar pagamento no Mercado Pago');
  }
});

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
  } catch {
    return jsonError(c, 500, 'Erro ao buscar status do pagamento');
  }
});

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
          
          // Nota: updateOrderStatus já cria a transação de receita se o status for 'concluido'.
          // Para status 'pago', podemos querer criar a transação aqui se não for criada lá.
          // Atualmente updateOrderStatus só cria transação no status 'concluido'.
          
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
    } catch (error) {
      logger.error('Erro ao processar webhook do Mercado Pago', error as Error, {
        topic,
        resource: String(resource),
      });
    }
  }

  return c.text('OK', 200);
});

export default router;
