import { API_BASE } from './client';

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function getStatusLabel(status) {
  const labels = {
    novo: 'Novo',
    recebido: 'Recebido',
    em_preparo: 'Em Preparo',
    saiu_entrega: 'Saiu para Entrega',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  return labels[status] || status;
}

export function getStatusVariant(status) {
  const variants = {
    novo: 'info',
    recebido: 'neutral',
    em_preparo: 'info',
    saiu_entrega: 'warning',
    concluido: 'success',
    cancelado: 'danger',
  };

  return variants[status] || 'neutral';
}

export function getPaymentMethodLabel(method) {
  const labels = {
    pix: 'PIX',
    maquininha: 'Maquininha',
  };

  return labels[method] || method || '—';
}

export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const apiRoot = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  return `${apiRoot}${path.startsWith('/') ? '' : '/'}${path}`;
}
