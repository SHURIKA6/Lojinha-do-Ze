import { request } from './client';

export function getProducts() {
  return request('/products');
}

export function createProduct(product: any) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export function updateProduct(id: string | number, product: any) {
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id: string | number) {
  return request(`/products/${id}`, { method: 'DELETE' });
}

export function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return request('/upload', {
    method: 'POST',
    body: formData,
  });
}
