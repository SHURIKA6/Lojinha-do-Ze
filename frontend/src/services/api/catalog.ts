import { request } from './client';

export interface CatalogParams {
  limit?: string | number;
  offset?: string | number;
  search?: string;
  category?: string;
}

export function getCatalog(params: CatalogParams = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);

  const queryString = query.toString();
  return request(`/catalog${queryString ? `?${queryString}` : ''}`);
}
