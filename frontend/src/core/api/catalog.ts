/**
 * API do Catálogo de Produtos
 * 
 * Busca produtos, categorias e gerencia o catálogo da loja.
 * Suporta paginação e filtros.
 */

import { request } from './client';
import { Product } from '@/types';

export interface CatalogParams {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  signal?: AbortSignal;
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
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params.sortBy) query.set('sortBy', params.sortBy);

  const queryString = query.toString();
  const options = params.signal ? { signal: params.signal } : {};
  return request<CatalogResponse>(`/catalog${queryString ? `?${queryString}` : ''}`, options);
}
