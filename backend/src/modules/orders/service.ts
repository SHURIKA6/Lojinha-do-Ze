import { Database } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { getRequiredEnv } from '../../core/load-local-env';
import { MercadoPagoService } from '../payments/service';
import * as orderRepository from './repository';
import { normalizePhoneDigits, cleanOptionalString } from '../../core/utils/normalize';
import { sendWhatsAppMessage } from '../notifications/whatsapp';
import { broadcastNotification } from '../notifications/notifier';


interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  items: orderRepository.OrderItem[];
  delivery_type: string;
  address?: string;
  notes?: string;
  payment_method: string;
}

interface OrderServiceUser {
  id: string;
  role: string;
  phone?: string;
}

function mergeOrderItems(items: orderRepository.OrderItem[]): orderRepository.OrderItem[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const current = merged.get(item.productId) || 0;
    merged.set(item.productId, current + item.quantity);
  }
  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function createOrder(db: Database, payload: CreateOrderPayload, authUser: OrderServiceUser | null, env: any) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const normalizedRequestPhone = normalizePhoneDigits(payload.customer_phone);
    const mergedItems = mergeOrderItems(payload.items);
    const deliveryFeeValue = parseFloat(env?.DELIVERY_FEE || '5');
    const deliveryFee = payload.delivery_type === 'entrega' ? deliveryFeeValue : 0;

    let subtotal = 0;
    const enrichedItems: orderRepository.EnrichedOrderItem[] = [];

    const productIds = mergedItems.map(item => parseInt(item.productId));
    const products = await orderRepository.findProductsByIds(client, productIds);

    if (products.length !== mergedItems.length) {
      throw new Error(`Um ou mais produtos não foram encontrados ou estão inativos`);
    }

    for (const item of mergedItems) {
      const product = products.find((p: any) => p.id === parseInt(item.productId));
      if (!product) {
        throw new Error(`Produto ID ${item.productId} não encontrado`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}`);
      }

      const itemSubtotal = parseFloat(product.sale_price) * item.quantity;
      subtotal += itemSubtotal;
      enrichedItems.push({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.sale_price),
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    let customerId: string | null = null;
    if (authUser?.role === 'customer') {
      const normalizedUserPhone = normalizePhoneDigits(authUser.phone || '');
      if (!normalizedUserPhone || normalizedUserPhone !== normalizedRequestPhone) {
        throw new Error('Telefone do pedido não corresponde ao cliente autenticado');
      }
      customerId = authUser.id;
    }

    const total = subtotal + deliveryFee;
    const order = await orderRepository.createOrder(client, {
      customerId,
      customerName: payload.customer_name.trim(),
      customerPhone: payload.customer_phone.trim(),
      items: enrichedItems,
      subtotal,
      deliveryFee,
      total,
      deliveryType: payload.delivery_type,
      address: cleanOptionalString(payload.address) || '',
      paymentMethod: payload.payment_method,
      notes: cleanOptionalString(payload.notes) || '',
    });

    if (enrichedItems.length > 0) {
      const pIds = enrichedItems.map((i) => parseInt(i.productId));
      const quantities = enrichedItems.map((i) => i.quantity);
      const names = enrichedItems.map((i) => i.name);

      const updatedProducts = await orderRepository.updateStock(client, pIds, quantities);
      if (updatedProducts.length !== enrichedItems.length) {
        throw new Error('Estoque insuficiente ou concorrente para um dos itens do pedido');
      }

      // Check for low stock alerts
      const lowStockAlerts = updatedProducts.filter((p: any) => p.quantity <= 5);
      for (const p of lowStockAlerts) {
        broadcastNotification(env, {
          type: 'stock',
          title: 'Estoque Baixo!',
          message: `O produto "${p.name}" está com apenas ${p.quantity} unidades restantes.`,
          productId: p.id,
          quantity: p.quantity
        }).catch(err => logger.error('Low stock notification error', err));
      }

      await orderRepository.logInventory(client, pIds, names, quantities, `Pedido #${order.id}`);
    }


    await client.query('COMMIT');

    // WhatsApp Notifications (Post-Commit)
    const orderItemsSummary = enrichedItems
      .map(i => `- ${i.quantity}x ${i.name}`)
      .join('\n');
    
    const customerMsg = `Olá, ${payload.customer_name}! Seu pedido #${order.id} na Lojinha do Zé foi recebido com sucesso. Total: R$ ${total.toFixed(2)}.`;
    const zeMsg = `Novo pedido recebido! #${order.id}\nCliente: ${payload.customer_name}\nTelefone: ${payload.customer_phone}\nTotal: R$ ${total.toFixed(2)}\nItens:\n${orderItemsSummary}`;

    // Use waitUntil if available (for Cloudflare Workers) to not block the response
    const notifyPromises = [
      sendWhatsAppMessage(env, payload.customer_phone, customerMsg),
    ];
    if (env.ZE_PHONE) {
      notifyPromises.push(sendWhatsAppMessage(env, env.ZE_PHONE, zeMsg));
    }

    if (env.executionCtx?.waitUntil) {
      env.executionCtx.waitUntil(Promise.all(notifyPromises));
    } else {
      // Background execution for other environments
      Promise.all(notifyPromises).catch(err => logger.error('Order creation WhatsApp error', err));
    }

    // Real-time notification for admin
    const rtNotification = broadcastNotification(env, {
      type: 'order',
      title: 'Novo Pedido!',
      message: `O cliente ${payload.customer_name} acabou de fazer o pedido #${order.id}.`,
      orderId: order.id,
      total: total
    });

    if (env.executionCtx?.waitUntil) {
      env.executionCtx.waitUntil(rtNotification);
    }

    return order;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro interno ao processar pedido');
  } finally {
    if (client.release) client.release();
  }
}

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
  env: any,
  trackingCode?: string
) {
  const client = await db.connect();
  let paymentIdToCancel: string | null = null;
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
      const items = (Array.isArray(currentOrder.items) ? currentOrder.items : JSON.parse(currentOrder.items || '[]')) as orderRepository.EnrichedOrderItem[];
      if (items.length > 0) {
        await orderRepository.restoreProductStockBulk(
          client,
          items.map(i => parseInt(i.productId)),
          items.map(i => i.quantity),
          items.map(i => i.name),
          `Cancelamento ou Exclusão do Pedido #${id}`
        );
      }



      if (currentOrder.payment_id) {
        paymentIdToCancel = currentOrder.payment_id;
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

    const updatedOrder = await orderRepository.updateOrderStatus(client, id, status, trackingCode);
    await client.query('COMMIT');

    // WhatsApp Notification for Status Update
    const statusMap: Record<string, string> = {
      'pendente': 'está pendente',
      'pago': 'foi pago e está sendo preparado',
      'enviado': 'foi enviado! Logo chegará até você',
      'concluido': 'foi finalizado. Obrigado pela preferência!',
      'cancelado': 'foi cancelado',
    };

    const statusText = statusMap[status] || `mudou para ${status}`;
    let msg = `Olá, ${currentOrder.customer_name}! O status do seu pedido #${id} na Lojinha do Zé ${statusText}.`;
    
    if (trackingCode) {
      msg += `\nCódigo de rastreio: ${trackingCode}`;
    }

    const notifyPromises = [sendWhatsAppMessage(env, currentOrder.customer_phone, msg)];
    
    if (env.ZE_PHONE && (status === 'pago' || status === 'cancelado' || status === 'concluido')) {
      const zeUpdateMsg = `Status do pedido #${id} atualizado para: ${status}.\nCliente: ${currentOrder.customer_name}`;
      notifyPromises.push(sendWhatsAppMessage(env, env.ZE_PHONE, zeUpdateMsg));
    }

    if (env.executionCtx?.waitUntil) {
      env.executionCtx.waitUntil(Promise.all(notifyPromises));
    } else {
      Promise.all(notifyPromises).catch(err => logger.error('Order status update WhatsApp error', err));
    }

    // Real-time notification for status change
    const rtNotification = broadcastNotification(env, {
      type: 'payment',
      title: 'Status de Pedido Atualizado',
      message: `O pedido #${id} mudou para: ${status}.`,
      orderId: id,
      status: status
    });

    if (env.executionCtx?.waitUntil) {
      env.executionCtx.waitUntil(rtNotification);
    }

    if (paymentIdToCancel) {
      try {
        const token = getRequiredEnv({ env }, 'MERCADO_PAGO_ACCESS_TOKEN');
        const mpService = new MercadoPagoService(token);
        await mpService.cancelPayment(paymentIdToCancel);
        logger.info(`Pagamento ${paymentIdToCancel} cancelado no Mercado Pago após commit`);
      } catch (mpError) {
        logger.error('Erro ao cancelar pagamento no Mercado Pago após commit', mpError as Error, {
          paymentId: paymentIdToCancel,
          orderId: id,
        });
      }
    }

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
      const items = (Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]')) as orderRepository.EnrichedOrderItem[];
      if (items.length > 0) {
        await orderRepository.restoreProductStockBulk(
          client,
          items.map(i => parseInt(i.productId)),
          items.map(i => i.quantity),
          items.map(i => i.name),
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
