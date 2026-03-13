import { request } from './client';

export function login(identifier, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export function getMe() {
  return request('/auth/me');
}

export function setupPassword(payload) {
  return request('/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

