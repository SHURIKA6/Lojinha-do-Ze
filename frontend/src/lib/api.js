/* ============================================
   LOJINHA DO ZÉ - API Client
   Replaces localStorage db.js with HTTP calls to backend
   ============================================ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://lojinha-do-ze-backend.fernandoriaddasilvaribeiro.workers.dev/api';

// ============================================
// Token Management
// ============================================
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lojinha_token');
}

function setToken(token) {
  localStorage.setItem('lojinha_token', token);
}

function removeToken() {
  localStorage.removeItem('lojinha_token');
}

// ============================================
// Upload API
// ============================================
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = getToken();
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao fazer upload da imagem');
  return data;
}

// ============================================
// HTTP Helper
// ============================================
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  return data;
}

// ============================================
// Auth API
// ============================================
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function loginPhone(phone, name) {
  const data = await request('/auth/phone', {
    method: 'POST',
    body: JSON.stringify({ phone, name }),
  });
  setToken(data.token);
  return data;
}

export async function getMe() {
  return request('/auth/me');
}

export function logout() {
  removeToken();
}

export function isLoggedIn() {
  return !!getToken();
}

// ============================================
// Dashboard API
// ============================================
export async function getDashboard() {
  return request('/dashboard');
}

// ============================================
// Products API
// ============================================
export async function getProducts() {
  return request('/products');
}

export async function createProduct(product) {
  return request('/products', { method: 'POST', body: JSON.stringify(product) });
}

export async function updateProduct(id, product) {
  return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) });
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' });
}

// ============================================
// Customers API
// ============================================
export async function getCustomers() {
  return request('/customers');
}

export async function createCustomer(customer) {
  return request('/customers', { method: 'POST', body: JSON.stringify(customer) });
}

export async function updateCustomer(id, customer) {
  return request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(customer) });
}

export async function deleteCustomer(id) {
  return request(`/customers/${id}`, { method: 'DELETE' });
}

// ============================================
// Transactions API (Admin)
// ============================================
export async function getTransactions(type) {
  const query = type ? `?type=${type}` : '';
  return request(`/transactions${query}`);
}

export async function createTransaction(transaction) {
  return request('/transactions', { method: 'POST', body: JSON.stringify(transaction) });
}

export async function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: 'DELETE' });
}

// ============================================
// Reports API
// ============================================
export async function getReport(type) {
  return request(`/reports/${type}`);
}

// ============================================
// Profile API
// ============================================
export async function updateProfile(data) {
  return request('/profile', { method: 'PUT', body: JSON.stringify(data) });
}

// ============================================
// Catalog API (Public — no auth)
// ============================================
export async function getCatalog() {
  const res = await fetch(`${API_BASE}/catalog`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao carregar catálogo');
  return data;
}

export async function createOrder(orderData) {
  const res = await fetch(`${API_BASE}/catalog/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao criar pedido');
  return data;
}

// ============================================
// Orders API 
// ============================================
export async function getOrders(status) {
  const query = status ? `?status=${status}` : '';
  return request(`/orders${query}`);
}

export async function updateOrderStatus(id, status) {
  return request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function deleteOrder(id) {
  return request(`/orders/${id}`, { method: 'DELETE' });
}

// ============================================
// Formatting Utilities (kept in frontend)
// ============================================
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

export function getStatusLabel(status) {
  const labels = {
    recebido: 'Recebido', em_preparo: 'Em Preparo', saiu_entrega: 'Saiu para Entrega',
    concluido: 'Concluído', cancelado: 'Cancelado',
  };
  return labels[status] || status;
}

export function getStatusVariant(status) {
  const variants = {
    recebido: 'neutral', em_preparo: 'info', saiu_entrega: 'warning',
    concluido: 'success', cancelado: 'danger',
  };
  return variants[status] || 'neutral';
}

export function getPaymentMethodLabel(method) {
  const labels = { pix: 'PIX', cartao: 'Cartão', dinheiro: 'Dinheiro', boleto: 'Boleto', transferencia: 'Transferência' };
  return labels[method] || method || '—';
}

export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // Make sure we strip /api from API_BASE if the path already starts with /api
  const base = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
