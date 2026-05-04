/**
 * API: products
 */

import { request } from './client';
import { Product, ApiResponse } from '@/types';

export async function getProducts(): Promise<Product[]> {
  const res = await request<ApiResponse<Product[]> | Product[]>('/products');
  // Backend returns array directly (c.json(products)), not wrapped in ApiResponse
  if (Array.isArray(res)) return res as Product[];
  if (res && 'data' in res && Array.isArray(res.data)) return res.data;
  return [];
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await request<ApiResponse<Product> | Product>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as Product;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as Product;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao criar produto');
}

export async function updateProduct(id: string | number, product: Partial<Product>): Promise<Product> {
  const res = await request<ApiResponse<Product> | Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
  if (res && typeof res === 'object' && 'id' in res) return res as Product;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'id' in res.data) {
    return res.data as Product;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao atualizar produto');
}

export async function deleteProduct(id: string | number): Promise<void> {
  await request<ApiResponse<void>>(`/products/${id}`, { method: 'DELETE' });
}

export interface UploadImageResponse {
  url: string;
}

export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await request<ApiResponse<UploadImageResponse> | UploadImageResponse>('/upload', {
    method: 'POST',
    body: formData,
  });
  if (res && typeof res === 'object' && 'url' in res) return res as UploadImageResponse;
  if (res && typeof res === 'object' && 'data' in res && res.data && typeof res.data === 'object' && 'url' in res.data) {
    return res.data as UploadImageResponse;
  }
  throw new Error((res as ApiResponse)?.message || 'Erro ao enviar imagem');
}
