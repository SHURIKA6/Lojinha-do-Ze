import { request } from './client';

export function getTransactions(type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return request(`/transactions${query}`);
}

export function createTransaction(transaction) {
  return request('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
}

export function deleteTransaction(id) {
  return request(`/transactions/${id}`, {
    method: 'DELETE',
  });
}
