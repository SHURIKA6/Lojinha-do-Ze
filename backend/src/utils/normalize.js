export function cleanOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function cleanRequiredString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizePhoneDigits(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

export function normalizeCpfDigits(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

export function isValidCpf(cpf) {
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

export function isValidUuid(id) {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Valida se um ID é válido (UUID ou inteiro positivo).
 * Centralizado aqui para evitar duplicação entre rotas.
 */
export function isValidId(id) {
  if (typeof id !== 'string') return false;
  return isValidUuid(id) || /^\d+$/.test(id);
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function buildAvatar(name) {
  if (typeof name !== 'string' || !name.trim()) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function isUniqueViolation(err) {
  return err?.code === '23505';
}

export function uniqueFieldLabel(err) {
  const detail = err?.detail || '';

  if (detail.includes('(email)')) return 'E-mail';
  if (detail.includes('(phone)')) return 'Telefone';
  if (detail.includes('(code)')) return 'Código';

  return 'Registro';
}
