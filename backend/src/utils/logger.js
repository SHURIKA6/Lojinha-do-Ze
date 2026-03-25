/* eslint-disable no-console */
/**
 * Utilitário de log para sanitizar e mascarar dados sensíveis antes do registro.
 */

const SENSITIVE_FIELDS = [
  'password', 'currentpassword', 'newpassword', 'confirmpassword',
  'token', 'code', 'cpf', 'address', 'phone', 'email',
  'setup_code', 'token_hash', 'csrf_token', 'identifier',
  'identification_number', 'identificationnumber',
];

function maskValue(value) {
  if (typeof value !== 'string') return value;
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = maskValue(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info: (message, context) => {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(sanitizeObject(context)) : '');
  },
  warn: (message, context) => {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(sanitizeObject(context)) : '');
  },
  error: (message, error, context) => {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      ...error
    } : error;

    console.error(`[ERROR] ${message}`, JSON.stringify({
      error: sanitizeObject(errorDetails),
      context: sanitizeObject(context)
    }));
  }
};
