import { request } from './client';

export function getTransactions(type?: string) {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return request(`/transactions${query}`);
}

export function createTransaction(transaction: any) {
  return request('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
}

export function deleteTransaction(id: string | number) {
  return request(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
