import { request } from './client';
import { User, Order, ApiResponse } from '@/types';

export async function getCustomers(): Promise<User[]> {
  const res = await request<any>('/customers');
  // O backend retorna o array diretamente (c.json(customers))
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export async function getCustomer(id: string): Promise<User> {
  const res = await request<any>(`/customers/${id}`);
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Usuário não encontrado');
}

export async function getCustomerOrders(id: string): Promise<Order[]> {
  const res = await request<any>(`/customers/${id}/orders`);
  if (Array.isArray(res)) return res;
  return res?.data || [];
}

export async function createCustomer(customer: Partial<User>): Promise<User> {
  const res = await request<any>('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao criar usuário');
}

export async function updateCustomer(id: string, customer: Partial<User>): Promise<User> {
  const res = await request<any>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao atualizar usuário');
}

export async function sendCustomerInvite(id: string): Promise<User> {
  const res = await request<any>(`/customers/${id}/invite`, {
    method: 'POST',
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao gerar convite');
}

export async function resetCustomerPassword(id: string): Promise<void> {
  await request<ApiResponse<void>>(`/customers/${id}/reset-password`, {
    method: 'PATCH',
  });
}

export async function updateUserRole(id: string, role: string, password?: string): Promise<void> {
  await request<ApiResponse<void>>(`/customers/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role, password }),
  });
}

export async function deleteCustomer(id: string, password?: string): Promise<void> {
  await request<ApiResponse<void>>(`/customers/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
