import { request } from './client';
import { User, ApiResponse } from '@/types';

export interface LoginResponse {
  user: User;
  token?: string;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await request<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  if (res && (res.user || res.token)) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao fazer login');
}

export async function logout(): Promise<void> {
  await request<ApiResponse<void>>('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  const res = await request<any>('/auth/me');
  if (res?.user) return res.user;
  if (res?.data?.user) return res.data.user;
  throw new Error(res?.message || 'Sessão inválida');
}

export async function setupPassword(payload: any): Promise<any> {
  const res = await request<any>('/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data !== undefined ? res.data : res;
}

export async function changePassword(payload: any): Promise<any> {
  const res = await request<any>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data !== undefined ? res.data : res;
}
