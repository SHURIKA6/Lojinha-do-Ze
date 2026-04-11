import { request } from './client';
import { User, Order, ApiResponse } from '@/types';

export async function getCustomers(): Promise<User[]> {
  const res = await request<ApiResponse<User[]>>('/customers');
  return res.data || [];
}

export async function getCustomer(id: string): Promise<User> {
  const res = await request<ApiResponse<User>>(`/customers/${id}`);
  if (!res.data) throw new Error(res.message || 'Usuário não encontrado');
  return res.data;
}

export async function getCustomerOrders(id: string): Promise<Order[]> {
  const res = await request<ApiResponse<Order[]>>(`/customers/${id}/orders`);
  return res.data || [];
}

export async function createCustomer(customer: Partial<User>): Promise<User> {
  const res = await request<ApiResponse<User>>('/customers', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao criar usuário');
  return res.data;
}

export async function updateCustomer(id: string, customer: Partial<User>): Promise<User> {
  const res = await request<ApiResponse<User>>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao atualizar usuário');
  return res.data;
}

export async function sendCustomerInvite(id: string): Promise<User> {
  const res = await request<ApiResponse<User>>(`/customers/${id}/invite`, {
    method: 'POST',
  });
  if (!res.data) throw new Error(res.message || 'Erro ao gerar convite');
  return res.data;
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
