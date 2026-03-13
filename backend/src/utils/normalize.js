export function cleanOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function normalizePhoneDigits(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
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
