import { request } from './client';
import { Product, ApiResponse } from '@/types';

export async function getProducts(): Promise<Product[]> {
  const res = await request<ApiResponse<Product[]>>('/products');
  return res.data || [];
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await request<ApiResponse<Product>>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao criar produto');
  return res.data;
}

export async function updateProduct(id: string | number, product: Partial<Product>): Promise<Product> {
  const res = await request<ApiResponse<Product>>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
  if (!res.data) throw new Error(res.message || 'Erro ao atualizar produto');
  return res.data;
}

export async function deleteProduct(id: string | number): Promise<void> {
  await request<ApiResponse<void>>(`/products/${id}`, { method: 'DELETE' });
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await request<ApiResponse<{ url: string }>>('/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.data) throw new Error(res.message || 'Erro ao enviar imagem');
  return res.data;
}
