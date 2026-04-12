import { request } from './client';
import { Order, OrderStatus, ApiResponse } from '@/types';

export async function getOrders(status?: OrderStatus): Promise<Order[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await request<ApiResponse<Order[]>>(`/orders${query}`);
  return res.data || [];
}

export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const res = await request<{ order: Order; message?: string }>('/catalog/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
  
  if (!res.order) throw new Error(res.message || 'Erro ao criar pedido');
  return res.order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const res = await request<ApiResponse<Order>>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao atualizar status do pedido');
  return res.data;
}

export async function deleteOrder(id: string): Promise<void> {
  await request<ApiResponse<void>>(`/orders/${id}`, {
    method: 'DELETE',
  });
}
