import { request } from './client';
import { User, ApiResponse } from '@/types';

export interface LoginResponse {
  user: User;
  token?: string;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await request<ApiResponse<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao fazer login');
  return res.data;
}

export async function logout(): Promise<void> {
  await request<ApiResponse<void>>('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  const res = await request<ApiResponse<User>>('/auth/me');
  if (!res.data) throw new Error(res.message || 'Sessão inválida');
  return res.data;
}

export async function setupPassword(payload: any): Promise<any> {
  const res = await request<ApiResponse<any>>('/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function changePassword(payload: any): Promise<any> {
  const res = await request<ApiResponse<any>>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}
