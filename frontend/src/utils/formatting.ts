export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string | Date | null | undefined) {
  if (!dateStr) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    novo: 'Novo',
    recebido: 'Recebido',
    em_preparo: 'Em Preparo',
    saiu_entrega: 'Saiu para Entrega',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
  };

  return labels[status as string] || status;
}

export function getStatusVariant(status: string) {
  const variants: Record<string, string> = {
    novo: 'info',
    recebido: 'neutral',
    em_preparo: 'info',
    saiu_entrega: 'warning',
    concluido: 'success',
    cancelado: 'danger',
  };

  return variants[status as string] || 'neutral';
}

export function getPaymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    pix: 'PIX',
    maquininha: 'Maquininha',
  };

  return labels[method as string] || method || '—';
}

export function formatCpf(value: string) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function isValidCpf(cpf: string) {
  if (typeof cpf !== 'string') return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[10])) return false;

  return true;
}

export function isValidEmail(email: string) {
  if (typeof email !== 'string') return false;
  const normalized = email.trim();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
