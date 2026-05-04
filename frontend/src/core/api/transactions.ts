/**
 * API: transactions
 */

import { request } from './client';
import { Transaction, ApiResponse } from '@/types';
export type { Transaction };

export async function getTransactions(type?: string): Promise<Transaction[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const res = await request<Transaction[] | ApiResponse<Transaction[]>>(`/transactions${query}`);
  // Backend returns array directly (c.json(rows)), not wrapped in ApiResponse
  if (Array.isArray(res)) return res as Transaction[];
  if (res && 'data' in res && Array.isArray((res as ApiResponse<Transaction[]>).data)) {
    return (res as ApiResponse<Transaction[]>).data as Transaction[];
  }
  return [];
}

export async function createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
  const res = await request<Transaction | ApiResponse<Transaction>>('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as Transaction;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in (res as ApiResponse<Transaction>).data!) {
    return (res as ApiResponse<Transaction>).data as Transaction;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao criar transação');
}

export async function deleteTransaction(id: string): Promise<void> {
  await request<ApiResponse<void>>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
