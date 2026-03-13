import { request } from './client';

export function getCatalog() {
  return request('/catalog');
}
