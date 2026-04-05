import { request } from './client';

export function getCustomers() {
  return request('/customers');
}

export function getCustomer(id) {
  return request(`/customers/${id}`);
}

export function getCustomerOrders(id) {
  return request(`/customers/${id}/orders`);
}

export function createCustomer(customer) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

export function updateCustomer(id, customer) {
  return request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
}

export function sendCustomerInvite(id) {
  return request(`/customers/${id}/invite`, {
    method: 'POST',
  });
}

export function resetCustomerPassword(id) {
  return request(`/customers/${id}/reset-password`, {
    method: 'PATCH',
  });
}

export function updateUserRole(id, role, password) {
  return request(`/customers/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role, password }),
  });
}

export function deleteCustomer(id, password) {
  return request(`/customers/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
