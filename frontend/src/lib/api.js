/* ============================================
   LOJINHA DO ZÉ - API Client
   Replaces localStorage db.js with HTTP calls to backend
   ============================================ */

const API_BASE = 'https://lojinha-do-ze-backend.fernandoriaddasilvaribeiro.workers.dev/api';

// ============================================
// Token Management
// ============================================
function getToken() {
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
// Services API
// ============================================
export async function getServices(customerId) {
  const query = customerId ? `?customer_id=${customerId}` : '';
  return request(`/services${query}`);
}

export async function createService(service) {
  return request('/services', { method: 'POST', body: JSON.stringify(service) });
}

export async function updateService(id, service) {
  return request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(service) });
}

export async function updateServiceStatus(id, status) {
  return request(`/services/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function deleteService(id) {
  return request(`/services/${id}`, { method: 'DELETE' });
}

// ============================================
// Payments API
// ============================================
export async function getPayments(customerId) {
  const query = customerId ? `?customer_id=${customerId}` : '';
  return request(`/payments${query}`);
}

export async function createPayment(payment) {
  return request('/payments', { method: 'POST', body: JSON.stringify(payment) });
}

export async function registerPayment(id, amount, method) {
  return request(`/payments/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount, method }),
  });
}

export async function deletePayment(id) {
  return request(`/payments/${id}`, { method: 'DELETE' });
}

// ============================================
// Transactions API
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
// Orders API (Admin)
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
    pendente: 'Pendente', em_andamento: 'Em Andamento', concluido: 'Concluído',
    entregue: 'Entregue', cancelado: 'Cancelado', pago: 'Pago', parcial: 'Parcial', atrasado: 'Atrasado',
  };
  return labels[status] || status;
}

export function getStatusVariant(status) {
  const variants = {
    pendente: 'warning', em_andamento: 'info', concluido: 'success',
    entregue: 'primary', cancelado: 'danger', pago: 'success', parcial: 'warning', atrasado: 'danger',
  };
  return variants[status] || 'neutral';
}

export function getPaymentMethodLabel(method) {
  const labels = { pix: 'PIX', cartao: 'Cartão', dinheiro: 'Dinheiro', boleto: 'Boleto', transferencia: 'Transferência' };
  return labels[method] || method || '—';
}
