import { request } from './client';
import { Product } from '@/types';

export interface CatalogParams {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
}

export interface CatalogCategory {
  name: string;
  products: Product[];
}

export interface CatalogResponse {
  categories: CatalogCategory[];
  total: number;
  limit: number;
  offset: number;
}

export function getCatalog(params: CatalogParams = {}): Promise<CatalogResponse> {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);

  const queryString = query.toString();
  return request<CatalogResponse>(`/catalog${queryString ? `?${queryString}` : ''}`);
}
