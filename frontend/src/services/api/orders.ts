import { request } from './client';

export function getOrders(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/orders${query}`);
}

export function createOrder(orderData) {
  return request('/catalog/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export function updateOrderStatus(id, status) {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteOrder(id) {
  return request(`/orders/${id}`, {
    method: 'DELETE',
  });
}
