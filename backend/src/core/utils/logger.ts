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
] as const;

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel = (typeof process !== 'undefined' && process.env?.LOG_LEVEL)
  ? (LOG_LEVELS[process.env.LOG_LEVEL as LogLevel] ?? LOG_LEVELS.info)
  : LOG_LEVELS.info;

function maskValue(value: unknown): string {
  if (typeof value !== 'string') return String(value);
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function sanitizeObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase() as typeof SENSITIVE_FIELDS[number])) {
      sanitized[key] = maskValue(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: unknown;
}

function formatLog(level: LogLevel, message: string, context?: unknown): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    entry.context = sanitizeObject(context);
  }

  return JSON.stringify(entry);
}

interface ErrorDetails {
  message: string;
  stack?: string;
  name: string;
}

export const logger = {
  debug: (message: string, context?: unknown) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatLog('debug', message, context));
    }
  },
  info: (message: string, context?: unknown) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(formatLog('info', message, context));
    }
  },
  warn: (message: string, context?: unknown) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, context));
    }
  },
  error: (message: string, error?: Error | unknown, context?: unknown) => {
    if (currentLevel <= LOG_LEVELS.error) {
      const errorDetails: ErrorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : { message: String(error), name: 'UnknownError' };

      console.error(formatLog('error', message, {
        error: sanitizeObject(errorDetails),
        ...sanitizeObject(context) as Record<string, unknown>,
      }));
    }
  },
};