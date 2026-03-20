import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { pixPaymentSchema } from '../domain/schemas.js';
import { MercadoPagoService } from '../services/mercadoPagoService.js';
import { getRequiredEnv } from '../load-local-env.js';
import { jsonError, validationError } from '../utils/http.js';
import { logger } from '../utils/logger.js';

const router = new Hono();

// Instancia o serviço usando a variável de ambiente
const getService = (c) => {
  const token = getRequiredEnv(c, 'MERCADO_PAGO_ACCESS_TOKEN');
  return new MercadoPagoService(token);
};

/**
 * Cria um pagamento via Pix para um pedido existente
 */
router.post('/pix', zValidator('json', pixPaymentSchema, validationError), async (c) => {
  const db = c.get('db');
  const payload = c.req.valid('json');
  
  try {
    // 1. Busca o pedido para validar o valor
    const { rows: orderRows } = await db.query(
      'SELECT id, total, customer_name FROM orders WHERE id = $1',
      [payload.orderId]
    );

    if (!orderRows.length) {
      return jsonError(c, 404, 'Pedido não encontrado');
    }

    const order = orderRows[0];
    const service = getService(c);

    // 2. Cria o pagamento no Mercado Pago
    const payment = await service.createPixPayment({
      transaction_amount: Number(order.total),
      description: `Pedido #${order.id} - Lojinha do Zé`,
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      identification_number: payload.identificationNumber,
      external_reference: String(order.id),
      idempotencyKey: `order-pix-${order.id}-${Date.now()}` // Unique per request attempt
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
  const service = getService(c);

  try {
    const payment = await service.getPayment(paymentId);
    return c.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference
    });
  } catch (error) {
    return jsonError(c, 500, 'Erro ao buscar status do pagamento');
  }
});

/**
 * Webhook para notificações do Mercado Pago
 */
router.post('/webhook', async (c) => {
  const body = await c.req.json();
  const db = c.get('db');
  
  // O Mercado Pago envia notificações com 'type' ou no campo 'action'
  const resource = body.resource || (body.data && body.data.id);
  const topic = body.topic || body.type;

  if (topic === 'payment' && resource) {
    try {
      const service = getService(c);
      const paymentId = resource.split('/').pop() || resource;
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
              
              await client.query(
                'UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1',
                [orderId, 'recebido']
              );

              await client.query(
                `INSERT INTO transactions (type, category, description, value, date, order_id)
                 VALUES ($1, $2, $3, $4, NOW(), $5)`,
                ['receita', 'Venda de produtos (PIX)', `Pedido #${orderId} - ${order.customer_name}`, order.total, orderId]
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
      logger.error('Erro ao processar webhook do Mercado Pago', error, { body });
    }
  }

  // Sempre retorna 200/201 para o Mercado Pago não reenviar
  return c.text('OK', 200);
});

export default router;
