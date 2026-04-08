import { request } from './client';

export function getOrders(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/orders${query}`);
}

export function createOrder(orderData: any) {
  return request('/catalog/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export function updateOrderStatus(id: number | string, status: string) {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteOrder(id: number | string) {
  return request(`/orders/${id}`, {
    method: 'DELETE',
  });
}
