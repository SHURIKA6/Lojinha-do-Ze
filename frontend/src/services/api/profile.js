import { request } from './client';

export function updateProfile(data) {
  return request('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
