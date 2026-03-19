import { request } from './client';

export function getCatalog(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);

  const queryString = query.toString();
  return request(`/catalog${queryString ? `?${queryString}` : ''}`);
}
