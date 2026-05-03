/**
 * API: orders
 */

import { request } from './client';
import { Order, OrderStatus, ApiResponse } from '@/types';

export async function getOrders(status?: OrderStatus): Promise<Order[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await request<any>(`/orders${query}`);
  // Backend returns array directly (c.json(rows)), not wrapped in ApiResponse
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const res = await request<{ order: Order; message?: string }>('/catalog/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
  
  if (!res.order) throw new Error(res.message || 'Erro ao criar pedido');
  return res.order;
}

export async function updateOrderStatus(id: string, status: OrderStatus, trackingCode?: string): Promise<Order> {
  const res = await request<any>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, tracking_code: trackingCode }),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao atualizar status do pedido');
}

export async function deleteOrder(id: string): Promise<void> {
  await request<ApiResponse<void>>(`/orders/${id}`, {
    method: 'DELETE',
  });
}
