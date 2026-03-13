import { request } from './client';

export function getDashboard() {
  return request('/dashboard');
}

export function getReport(type) {
  return request(`/reports/${type}`);
}

