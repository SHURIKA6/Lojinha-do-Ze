/**
 * API: orders
 */

import { request } from './client';
import { Order, OrderStatus, PaymentMethod, ApiResponse, PaginatedResponse } from '@/types';

export interface CreateOrderData {
  user_id: string;
  items: Array<{
    product_id: string | number;
    quantity: number;
    price: number;
  }>;
  payment_method: PaymentMethod;
  delivery_type: 'pickup' | 'delivery';
  address?: string;
  notes?: string;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  notes?: string;
}

export interface UpdatePaymentData {
  payment_method: PaymentMethod;
  payment_id?: string;
}

export async function getOrders(params?: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  userId?: string;
}): Promise<PaginatedResponse<Order>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.userId) queryParams.append('userId', params.userId);

  const queryString = queryParams.toString();
  const endpoint = `/orders${queryString ? `?${queryString}` : ''}`;
  
  const res = await request<ApiResponse<PaginatedResponse<Order>> | PaginatedResponse<Order>>(endpoint);
  
  // Handle both wrapped and unwrapped responses from backend
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'pagination' in res.data) {
    return res.data as PaginatedResponse<Order>;
  }
  if (res && typeof res === 'object' && 'pagination' in res) {
    return res as PaginatedResponse<Order>;
  }
  if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
    return {
      success: true,
      data: res.data as Order[],
      pagination: {
        page: 1,
        limit: 10,
        total: res.data.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
  
  // Fallback for empty response
  return {
    success: true,
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
  };
}

export async function getOrderById(id: string | number): Promise<Order | null> {
  const res = await request<ApiResponse<Order> | Order>(`/orders/${id}`);
  if (res && typeof res === 'object' && 'id' in res) return res as Order;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as Order;
  }
  return null;
}

export async function createOrder(data: CreateOrderData): Promise<Order> {
  const res = await request<ApiResponse<Order> | Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as Order;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as Order;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao criar pedido');
}

export async function updateOrderStatus(id: string | number, data: UpdateOrderStatusData): Promise<Order> {
  const res = await request<ApiResponse<Order> | Order>(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as Order;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as Order;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao atualizar status do pedido');
}

export async function updateOrderPayment(id: string | number, data: UpdatePaymentData): Promise<Order> {
  const res = await request<ApiResponse<Order> | Order>(`/orders/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as Order;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as Order;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao atualizar pagamento do pedido');
}
