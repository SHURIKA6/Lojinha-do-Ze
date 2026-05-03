/**
 * API: images
 */

import { API_BASE } from './client';

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const apiRoot = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  return `${apiRoot}${path.startsWith('/') ? '' : '/'}${path}`;
}
