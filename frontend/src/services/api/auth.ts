import { request } from './client';
import { User } from '@/types';

export interface LoginResponse {
  user: User;
  token?: string;
}

export function login(identifier: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export function setupPassword(payload: any): Promise<any> {
  return request('/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: any): Promise<any> {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
