import { request } from './client';
import { Product, ApiResponse } from '@/types';

export async function getProducts(): Promise<Product[]> {
  const res = await request<any>('/products');
  // Backend returns array directly (c.json(products)), not wrapped in ApiResponse
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await request<any>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao criar produto');
}

export async function updateProduct(id: string | number, product: Partial<Product>): Promise<Product> {
  const res = await request<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao atualizar produto');
}

export async function deleteProduct(id: string | number): Promise<void> {
  await request<ApiResponse<void>>(`/products/${id}`, { method: 'DELETE' });
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await request<any>('/upload', {
    method: 'POST',
    body: formData,
  });
  if (res && res.url) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao enviar imagem');
}
