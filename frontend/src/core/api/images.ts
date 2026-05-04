/**
 * API: images
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const apiRoot = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
  return `${apiRoot}${path.startsWith('/') ? '' : '/'}${path}`;
}
