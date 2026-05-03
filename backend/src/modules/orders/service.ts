import { Database } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { getRequiredEnv } from '../../core/load-local-env';
import { MercadoPagoService } from '../payments/service';
import * as orderRepository from './repository';
import { normalizePhoneDigits, cleanOptionalString } from '../../core/utils/normalize';
import { sendWhatsAppMessage } from '../notifications/whatsapp';
import { broadcastNotification } from '../notifications/notifier';
import { notificationService, NOTIFICATION_TYPES } from '../system/notificationService';
import { loyaltyService } from '../customers/loyaltyService';
import { logSystemEvent } from '../system/logService';


/**
 * Payload para criação de um novo pedido.
 */
interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  items: orderRepository.OrderItem[];
  delivery_type: string;
  address?: string;
  notes?: string;
  payment_method: string;
  delivery_fee?: number;
  points_to_redeem?: number;
}

/**
 * Usuário autenticado que está realizando a operação no pedido.
 */
interface OrderServiceUser {
  id: string;
  role: string;
  phone?: string;
}

/**
 * Mescla itens duplicados do pedido somando suas quantidades.
 * @param items - Lista de itens do pedido que pode conter duplicatas.
 * @returns Lista de itens com quantidades agregadas por productId.
 */
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

/**
 * Faz o parse dos itens do pedido, aceitando tanto um array quanto uma string JSON.
 * @param items - Itens no formato array ou string JSON.
 * @returns Lista de itens enriquecidos do pedido.
 */
function parseItems(items: any): orderRepository.EnrichedOrderItem[] {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      return JSON.parse(items);
    } catch (e) {
      logger.error('Erro ao fazer parse de items (string)', e as Error, { items });
      return [];
    }
  }
  return [];
}

/**
 * Cria um novo pedido com transação, validação de estoque, cálculo de totais e notificações.
 * 
 * Fluxo:
 * 1. Valida e mescla itens duplicados
 * 2. Verifica estoque suficiente
 * 3. Calcula subtotal, taxa de entrega e desconto (pontos de fidelidade)
 * 4. Cria o pedido no banco
 * 5. Atualiza estoque e registra log de inventário
 * 6. Envia notificações WhatsApp (cliente e admin)
 * 7. Envia notificação em tempo real
 * 
 * @param db - Conexão com o banco de dados.
 * @param payload - Dados do pedido a ser criado.
 * @param authUser - Usuário autenticado (se houver) ou null para guest.
 * @param env - Variáveis de ambiente (Bindings do Cloudflare).
 * @param ctx - Contexto de execução (para waitUntil no Cloudflare Workers).
 * @returns O pedido criado.
 */
export async function createOrder(db: Database, payload: CreateOrderPayload, authUser: OrderServiceUser | null, env: any, ctx?: any) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const normalizedRequestPhone = normalizePhoneDigits(payload.customer_phone);
    const mergedItems = mergeOrderItems(payload.items);
    const deliveryFeeValue = parseFloat(env?.DELIVERY_FEE || '5');
    const deliveryFee = payload.delivery_type === 'entrega' ? (payload.delivery_fee ?? deliveryFeeValue) : 0;

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

    let discount = 0;
    if (payload.points_to_redeem && customerId) {
      const balance = await loyaltyService.getBalance(client, parseInt(customerId));
      const pointsToUse = Math.min(payload.points_to_redeem, balance);
      discount = pointsToUse * 0.05; // R$ 0,05 por ponto
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);
    const order = await orderRepository.createOrder(client, {
      customerId,
      customerName: payload.customer_name.trim(),
      customerPhone: payload.customer_phone.trim(),
      items: enrichedItems,
      deliveryFee,
      discount,
      subtotal,
      total,
      deliveryType: payload.delivery_type,
      address: cleanOptionalString(payload.address) || '',
      paymentMethod: payload.payment_method,
      notes: cleanOptionalString(payload.notes) || '',
    });

    if (discount > 0 && customerId) {
      await loyaltyService.spendPoints(client, parseInt(customerId), order.id, payload.points_to_redeem!);
    }

    if (enrichedItems.length > 0) {
      const pIds = enrichedItems.map((i) => parseInt(i.productId));
      const quantities = enrichedItems.map((i) => i.quantity);
      const names = enrichedItems.map((i) => i.name);

      const updatedProducts = await orderRepository.updateStock(client, pIds, quantities);
      if (updatedProducts.length !== enrichedItems.length) {
        throw new Error('Estoque insuficiente ou concorrente para um dos itens do pedido');
      }

      // Check for low stock alerts
      const lowStockAlerts = updatedProducts.filter((p: any) => p.quantity <= (p.min_stock ?? 5));
      for (const p of lowStockAlerts) {
        notificationService.send(NOTIFICATION_TYPES.LOW_STOCK, {
          productName: p.name,
          quantity: p.quantity,
          productId: p.id
        }, env, {}, ctx).catch(err => logger.error('Low stock notification error', err));
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

    if (ctx?.waitUntil) {
      ctx.waitUntil(Promise.all(notifyPromises));
    } else if (env.executionCtx?.waitUntil) {
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

/**
 * Lista pedidos com filtros opcionais de usuário e status.
 * @param db - Conexão com o banco de dados.
 * @param params - Parâmetros de filtro (userId, status, limit, offset).
 * @returns Lista de pedidos encontrados.
 */
export async function getOrders(
  db: Database,
  { userId, status, limit, offset }: { userId?: string; status?: string; limit: number; offset: number }
) {
  return orderRepository.findOrders(db, { userId, status, limit, offset });
}

/**
 * Atualiza o status de um pedido e executa ações associadas (notificações, estorno de pontos, etc).
 * 
 * Regras de negócio por status:
 * - 'cancelado': restaura estoque, cancela pagamento no Mercado Pago, estorna pontos de fidelidade
 * - 'concluido': registra transação financeira, concede pontos de fidelidade
 * 
 * @param db - Conexão com o banco de dados.
 * @param id - ID do pedido a ser atualizado.
 * @param status - Novo status do pedido.
 * @param env - Variáveis de ambiente.
 * @param ctx - Contexto de execução.
 * @param trackingCode - Código de rastreio (opcional, usado para status 'enviado').
 * @returns Objeto com dados do pedido atualizado ou erro.
 */
export async function updateOrderStatus(
  db: Database,
  id: string,
  status: string,
  env: any,
  ctx?: any,
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
      const items = parseItems(currentOrder.items);
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

      // Refund spent points if any
      if (currentOrder.customer_id && currentOrder.discount > 0) {
        const pointsToRefund = Math.round(currentOrder.discount / 0.05);
        if (pointsToRefund > 0) {
          await loyaltyService.refundPoints(client, parseInt(currentOrder.customer_id), parseInt(id), pointsToRefund);
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

      if (currentOrder.customer_id) {
        await loyaltyService.awardPoints(client, parseInt(currentOrder.customer_id), parseInt(id), currentOrder.subtotal);
      }
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

    if (ctx?.waitUntil) {
      ctx.waitUntil(Promise.all(notifyPromises));
    } else if (env.executionCtx?.waitUntil) {
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
    // If transaction was already committed, we shouldn't return a 500 error
    // because the primary action (updating the status) succeeded.
    // However, we don't know for sure here if it committed without checking state.
    // Better to catch specific errors in post-commit blocks (which we already do).
    
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Erro no updateOrderStatus', error as Error, { id });
    
    // Log to database for production debugging
    await logSystemEvent(db, env, 'error', `Erro no updateOrderStatus [ID: ${id}, Status: ${status}]: ${(error as Error).message}`, {
      orderId: id,
      status
    }, error as Error, ctx).catch(err => logger.error('Falha ao logar erro de status no banco', err));

    return { error: { code: 500, message: 'Erro ao modificar o status do pedido.' } };
  } finally {
    if (client.release) client.release();
  }
}

/**
 * Exclui um pedido permanentemente, restaurando o estoque se necessário.
 * 
 * Se o pedido não estiver cancelado ou concluído, o estoque dos itens é restaurado
 * e os pontos de fidelidade utilizados são estornados.
 * 
 * @param db - Conexão com o banco de dados.
 * @param id - ID do pedido a ser excluído.
 * @param env - Variáveis de ambiente.
 * @param ctx - Contexto de execução.
 * @returns Objeto com mensagem de sucesso ou erro.
 */
export async function deleteOrder(db: Database, id: string, env: any, ctx?: any) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const order = await orderRepository.findOrderByIdForUpdate(client, id);
    if (!order) {
      await client.query('ROLLBACK');
      return { error: { code: 404, message: 'Pedido não encontrado' } };
    }

    if (order.status !== 'cancelado' && order.status !== 'concluido') {
      const items = parseItems(order.items);
      if (items.length > 0) {
        await orderRepository.restoreProductStockBulk(
          client,
          items.map(i => parseInt(i.productId)),
          items.map(i => i.quantity),
          items.map(i => i.name),
          `Cancelamento ou Exclusão do Pedido #${id}`
        );
      }

      // Refund spent points if any
      if (order.customer_id && order.discount > 0) {
        const pointsToRefund = Math.round(order.discount / 0.05);
        if (pointsToRefund > 0) {
          await loyaltyService.refundPoints(client, parseInt(order.customer_id), parseInt(id), pointsToRefund);
        }
      }
    }



    await orderRepository.deleteOrder(client, id);
    await client.query('COMMIT');
    return { data: { message: 'Pedido excluído' } };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Erro no deleteOrder', error as Error, { id });

    // Log to database for production debugging
    await logSystemEvent(db, env, 'error', `Erro no deleteOrder [ID: ${id}]: ${(error as Error).message}`, {
      orderId: id
    }, error as Error, ctx).catch(err => logger.error('Falha ao logar erro de exclusão no banco', err));

    return { error: { code: 500, message: 'Erro ao excluir o pedido.' } };
  } finally {
    if (client.release) client.release();
  }
}
