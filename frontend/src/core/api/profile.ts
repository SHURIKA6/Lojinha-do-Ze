/**
 * API: profile
 */

import { request } from './client';
import { User, ApiResponse } from '@/types';

export interface LoyaltyData {
  balance: number;
  history: Array<{
    type: 'earn' | 'spend';
    points: number;
    description: string;
    created_at: string;
  }>;
}

export interface ProfileOptions {
  signal?: AbortSignal;
}

export async function updateProfile(data: Partial<User>, options?: ProfileOptions): Promise<User> {
  const res = await request<User | ApiResponse<User>>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });
  
  if (res && (res as User).id) return res as User;
  if (res && (res as ApiResponse<User>).data) return (res as ApiResponse<User>).data as User;
  throw new Error((res as ApiResponse)?.message || 'Erro ao atualizar perfil');
}

export async function getLoyaltyBalance(options?: ProfileOptions): Promise<LoyaltyData> {
  const res = await request<LoyaltyData>('/profile/loyalty', options || {});
  return res;
}
