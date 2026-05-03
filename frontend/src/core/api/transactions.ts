/**
 * API: transactions
 */

import { request } from './client';
import { Transaction, ApiResponse } from '@/types';

export async function getTransactions(type?: string): Promise<Transaction[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const res = await request<any>(`/transactions${query}`);
  // Backend returns array directly (c.json(rows)), not wrapped in ApiResponse
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export async function createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
  const res = await request<any>('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao criar transação');
}

export async function deleteTransaction(id: string): Promise<void> {
  await request<ApiResponse<void>>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
