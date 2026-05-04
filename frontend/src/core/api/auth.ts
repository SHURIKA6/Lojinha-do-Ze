/**
 * API de Autenticação
 * 
 * Gerencia login, logout, refresh de token e dados do usuário.
 * Dispara eventos customizados para controle de sessão.
 */

import { request } from './client';
import { User, ApiResponse } from '@/types';

export interface LoginResponse {
  user: User;
  token?: string;
}

export interface SetupPasswordPayload {
  token?: string;
  code?: string;
  password: string;
  confirmPassword?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn?: number;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const res = await request<LoginResponse | ApiResponse<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  
  if (res && (res as LoginResponse).user) return res as LoginResponse;
  if (res && (res as ApiResponse<LoginResponse>).data) return (res as ApiResponse<LoginResponse>).data as LoginResponse;
  throw new Error((res as ApiResponse)?.message || 'Erro ao fazer login');
}

export async function logout(): Promise<void> {
  await request<ApiResponse<void>>('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  const res = await request<User | ApiResponse<User>>('/auth/me');
  
  if (res && (res as User).id) return res as User;
  if (res && (res as ApiResponse<User>).data) return (res as ApiResponse<User>).data as User;
  throw new Error((res as ApiResponse)?.message || 'Sessão inválida');
}

export async function setupPassword(payload: SetupPasswordPayload): Promise<ApiResponse<void>> {
  const res = await request<ApiResponse<void>>('/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  return res as ApiResponse<void>;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<ApiResponse<void>> {
  const res = await request<ApiResponse<void>>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  return res as ApiResponse<void>;
}

export async function refreshToken(): Promise<RefreshTokenResponse> {
  const res = await request<RefreshTokenResponse | ApiResponse<RefreshTokenResponse>>('/auth/refresh', { method: 'POST' });
  
  if (res && (res as RefreshTokenResponse).token) return res as RefreshTokenResponse;
  if (res && (res as ApiResponse<RefreshTokenResponse>).data) return (res as ApiResponse<RefreshTokenResponse>).data as RefreshTokenResponse;
  throw new Error((res as ApiResponse)?.message || 'Erro ao renovar token');
}
