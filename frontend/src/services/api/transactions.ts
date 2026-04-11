import { request } from './client';
import { Transaction, ApiResponse } from '@/types';

export async function getTransactions(type?: string): Promise<Transaction[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const res = await request<ApiResponse<Transaction[]>>(`/transactions${query}`);
  return res.data || [];
}

export async function createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
  const res = await request<ApiResponse<Transaction>>('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao criar transação');
  return res.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await request<ApiResponse<void>>(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
