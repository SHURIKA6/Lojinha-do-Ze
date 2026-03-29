/* eslint-disable no-console */
/**
 * Utilitário de log para sanitizar e mascarar dados sensíveis antes do registro.
 * Inclui timestamps ISO 8601 e contexto estruturado para observabilidade em produção.
 */

const SENSITIVE_FIELDS = [
  'password', 'currentpassword', 'newpassword', 'confirmpassword',
  'token', 'code', 'cpf', 'address', 'phone', 'email',
  'setup_code', 'token_hash', 'csrf_token', 'identifier',
  'identification_number', 'identificationnumber',
];

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;

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

function formatLog(level, message, context) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    entry.context = sanitizeObject(context);
  }

  return JSON.stringify(entry);
}

export const logger = {
  debug: (message, context) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatLog('debug', message, context));
    }
  },
  info: (message, context) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(formatLog('info', message, context));
    }
  },
  warn: (message, context) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, context));
    }
  },
  error: (message, error, context) => {
    if (currentLevel <= LOG_LEVELS.error) {
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error;

      console.error(formatLog('error', message, {
        error: sanitizeObject(errorDetails),
        ...sanitizeObject(context),
      }));
    }
  },
};
