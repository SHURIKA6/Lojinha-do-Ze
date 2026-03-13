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
