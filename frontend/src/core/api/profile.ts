import { request } from './client';
import { User, ApiResponse } from '@/types';

export async function updateProfile(data: Partial<User>): Promise<User> {
  const res = await request<ApiResponse<User>>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao atualizar perfil');
  return res.data;
}
