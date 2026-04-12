import { Database } from '../types';
import { logger } from '../utils/logger';
import { getRequiredEnv } from '../load-local-env';
import { MercadoPagoService } from './mercadoPagoService';
import * as orderRepository from '../repositories/orderRepository';

export async function getOrders(
  db: Database,
  { userId, status, limit, offset }: { userId?: string; status?: string; limit: number; offset: number }
) {
  return orderRepository.findOrders(db, { userId, status, limit, offset });
}

export async function updateOrderStatus(
  db: Database,
  id: string,
  status: string,
  env: any
) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentOrder = await orderRepository.findOrderByIdForUpdate(client, id);
    if (!currentOrder) {
      await client.query('ROLLBACK');
      return { error: { code: 404, message: 'Pedido não encontrado' } };
    }

    if (
      status === 'cancelado' &&
      currentOrder.status !== 'cancelado' &&
      currentOrder.status !== 'concluido'
    ) {
      const items = Array.isArray(currentOrder.items) ? currentOrder.items : JSON.parse(currentOrder.items || '[]');
      for (const item of items) {
        await orderRepository.restoreProductStock(
          client,
          item.productId,
          item.quantity,
          item.name,
          `Cancelamento ou Exclusão do Pedido #${id}`
        );
      }

      if (currentOrder.payment_id) {
        try {
          const token = getRequiredEnv({ env }, 'MERCADO_PAGO_ACCESS_TOKEN');
          const mpService = new MercadoPagoService(token);
          await mpService.cancelPayment(currentOrder.payment_id);
          logger.info(`Pagamento ${currentOrder.payment_id} cancelado no Mercado Pago`);
        } catch (mpError) {
          logger.error('Erro ao cancelar no Mercado Pago', mpError as Error, {
            paymentId: currentOrder.payment_id,
          });
        }
      }
    }

    if (status === 'concluido' && currentOrder.status !== 'concluido') {
      await orderRepository.createTransaction(client, {
        type: 'receita',
        category: 'Venda de produtos',
        description: `Pedido #${id} - ${currentOrder.customer_name}`,
        value: currentOrder.total,
        orderId: id,
      });
    }

    const updatedOrder = await orderRepository.updateOrderStatus(client, id, status);
    await client.query('COMMIT');
    return { data: updatedOrder };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Erro no updateOrderStatus', error as Error, { id });
    return { error: { code: 500, message: 'Erro ao modificar o status do pedido.' } };
  } finally {
    if (client.release) client.release();
  }
}

export async function deleteOrder(db: Database, id: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const order = await orderRepository.findOrderByIdForUpdate(client, id);
    if (!order) {
      await client.query('ROLLBACK');
      return { error: { code: 404, message: 'Pedido não encontrado' } };
    }

    if (order.status !== 'cancelado' && order.status !== 'concluido') {
      const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
      for (const item of items) {
        await orderRepository.restoreProductStock(
          client,
          item.productId,
          item.quantity,
          item.name,
          `Cancelamento ou Exclusão do Pedido #${id}`
        );
      }
    }

    await orderRepository.deleteOrder(client, id);
    await client.query('COMMIT');
    return { data: { message: 'Pedido excluído' } };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Erro no deleteOrder', error as Error, { id });
    return { error: { code: 500, message: 'Erro ao excluir o pedido.' } };
  } finally {
    if (client.release) client.release();
  }
}
