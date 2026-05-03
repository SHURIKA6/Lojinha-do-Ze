/**
 * API: profile
 */

import { request } from './client';
import { User } from '@/types';

export interface LoyaltyData {
  balance: number;
  history: Array<{
    type: 'earn' | 'spend';
    points: number;
    description: string;
    created_at: string;
  }>;
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const res = await request<any>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao atualizar perfil');
}

export async function getLoyaltyBalance(): Promise<LoyaltyData> {
  const res = await request<LoyaltyData>('/profile/loyalty');
  return res;
}
