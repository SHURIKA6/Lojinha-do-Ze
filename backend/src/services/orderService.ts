import { Pool } from 'pg';
import { orderRepository, OrderItem, EnrichedOrderItem } from '../repositories/orderRepository';
import { normalizePhoneDigits, cleanOptionalString } from '../utils/normalize';
import { logger } from '../utils/logger';

interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
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

export class OrderService {
  async createOrder(db: Pool, payload: CreateOrderPayload, authUser: OrderServiceUser | null, env: any) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const normalizedRequestPhone = normalizePhoneDigits(payload.customer_phone);
      const mergedItems = this.mergeOrderItems(payload.items);
      const deliveryFeeValue = parseFloat(env?.DELIVERY_FEE || '5');
      const deliveryFee = payload.delivery_type === 'entrega' ? deliveryFeeValue : 0;

      let subtotal = 0;
      const enrichedItems: EnrichedOrderItem[] = [];

      const productIds = mergedItems.map(item => parseInt(item.productId));
      const products = await orderRepository.findProductsByIds(client, productIds);

      if (products.length !== mergedItems.length) {
        throw new Error(`Um ou mais produtos não foram encontrados ou estão inativos`);
      }

      for (const item of mergedItems) {
        const product = products.find(p => p.id === parseInt(item.productId));
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
        const pIds = enrichedItems.map((i) => i.productId);
        const quantities = enrichedItems.map((i) => i.quantity);
        const names = enrichedItems.map((i) => i.name);

        const rowCount = await orderRepository.updateStock(client, pIds, quantities);
        if (rowCount !== enrichedItems.length) {
          throw new Error('Estoque insuficiente ou concorrente para um dos itens do pedido');
        }

        await orderRepository.logInventory(client, pIds, names, quantities, `Pedido #${order.id}`);
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno ao processar pedido');
    } finally {
      client.release();
    }
  }

  private mergeOrderItems(items: OrderItem[]): OrderItem[] {
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
}

export const orderService = new OrderService();
