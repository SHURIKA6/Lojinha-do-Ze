import { request } from './client';
import type { CustomerRecord } from '@/types';
import type { UserRole } from '@/lib/roles';

export function getCustomers() {
  return request<CustomerRecord[]>('/customers');
}

export function getCustomer(id: string | number) {
  return request<CustomerRecord>(`/customers/${id}`);
}

export function getCustomerOrders(id: string | number) {
  return request(`/customers/${id}/orders`);
}

export function createCustomer(customer: any) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

export function updateCustomer(id: string | number, customer: any) {
  return request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
}

export function sendCustomerInvite(id: string | number) {
  return request(`/customers/${id}/invite`, {
    method: 'POST',
  });
}

export function resetCustomerPassword(id: string | number) {
  return request(`/customers/${id}/reset-password`, {
    method: 'PATCH',
  });
}

export function updateUserRole(id: string | number, role: UserRole, password?: string) {
  return request(`/customers/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role, password }),
  });
}

export function deleteCustomer(id: string | number, password?: string) {
  return request(`/customers/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
