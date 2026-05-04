/**
 * API: customers
 */

import { request } from './client';
import { User, Order, ApiResponse } from '@/types';

export interface CreateCustomerData {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  role?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  role?: string;
  is_active?: boolean;
  notes?: string;
}

export async function getCustomers(): Promise<User[]> {
  const res = await request<ApiResponse<User[]> | User[]>('/customers');
  if (Array.isArray(res)) return res as User[];
  if (res && 'data' in res && Array.isArray(res.data)) return res.data as User[];
  return [];
}

export async function getCustomerById(id: string): Promise<User | null> {
  const res = await request<ApiResponse<User> | User>(`/customers/${id}`);
  if (res && typeof res === 'object' && 'id' in res) return res as User;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as User;
  }
  return null;
}

export async function createCustomer(data: CreateCustomerData): Promise<User> {
  const res = await request<ApiResponse<User> | User>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as User;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as User;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao criar cliente');
}

export async function updateCustomer(id: string, data: UpdateCustomerData): Promise<User> {
  const res = await request<ApiResponse<User> | User>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as User;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as User;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao atualizar cliente');
}

export async function deleteCustomer(id: string, password?: string): Promise<void> {
  await request<ApiResponse<void>>(`/customers/${id}`, { 
    method: 'DELETE',
    ...(password ? { body: JSON.stringify({ password }) } : {}),
  });
}

export async function toggleCustomerStatus(id: string, isActive: boolean): Promise<User> {
  return updateCustomer(id, { is_active: isActive });
}

export async function getCustomerOrders(id: string): Promise<Order[]> {
  const res = await request<ApiResponse<Order[]> | Order[]>(`/customers/${id}/orders`);
  if (Array.isArray(res)) return res as Order[];
  if (res && 'data' in res && Array.isArray(res.data)) return res.data as Order[];
  return [];
}

// Alias para compatibilidade — getCustomer é sinônimo de getCustomerById
export async function getCustomer(id: string): Promise<User> {
  const result = await getCustomerById(id);
  if (!result) throw new Error('Cliente não encontrado');
  return result;
}

export async function sendCustomerInvite(id: string): Promise<User> {
  const res = await request<ApiResponse<User> | User>(`/customers/${id}/invite`, {
    method: 'POST',
  });
  if (res && typeof res === 'object' && 'id' in res) return res as User;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as User;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao gerar convite');
}

export async function updateUserRole(id: string, role: string, password: string): Promise<User> {
  const res = await request<ApiResponse<User> | User>(`/customers/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role, password }),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as User;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as User;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao atualizar cargo');
}

