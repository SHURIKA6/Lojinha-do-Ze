/**
 * Middleware de Validação Robusta
 * Valida dados de entrada com regras complexas e feedback detalhado
 */

import { Context, Next } from 'hono';
import { logger } from '../utils/logger';
import { sanitizeString } from './inputSanitization';

/**
 * Regras de validação predefinidas
 */
export const ValidationRules: Record<string, any> = {
  // Regras para produtos
  product: {
    name: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 140,
      sanitize: true,
      message: 'Nome do produto deve ter entre 3 e 140 caracteres'
    },
    code: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 20,
      pattern: /^[A-Za-z0-9-_]+$/,
      message: 'Código deve conter apenas letras, números, hífen e underscore'
    },
    category: {
      required: true,
      type: 'string',
      enum: ['Óleos Essenciais', 'Óleos', 'Chás e Infusões', 'Naturais', 'Cosméticos Naturais', 'Suplementos', 'Cápsulas', 'Tinturas', 'Cremes', 'Outros'],
      message: 'Categoria inválida'
    },
    quantity: {
      required: true,
      type: 'number',
      min: 0,
      max: 999999,
      integer: true,
      message: 'Quantidade deve ser um número inteiro entre 0 e 999999'
    },
    sale_price: {
      required: true,
      type: 'number',
      min: 0,
      max: 999999.99,
      message: 'Preço de venda deve ser entre 0 e 999999.99'
    }
  },
  
  // Regras para pedidos
  order: {
    customer_name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 120,
      sanitize: true,
      message: 'Nome do cliente deve ter entre 2 e 120 caracteres'
    },
    customer_phone: {
      required: true,
      type: 'string',
      pattern: /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/,
      message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    },
    items: {
      required: true,
      type: 'array',
      minLength: 1,
      message: 'Pedido deve conter pelo menos 1 item'
    },
    delivery_type: {
      required: true,
      type: 'string',
      enum: ['entrega', 'retirada'],
      message: 'Tipo de entrega deve ser "entrega" ou "retirada"'
    }
  },
  
  // Regras para usuários
  user: {
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 120,
      sanitize: true,
      message: 'Nome deve ter entre 2 e 120 caracteres'
    },
    email: {
      required: false,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'E-mail inválido'
    },
    phone: {
      required: false,
      type: 'string',
      pattern: /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/,
      message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
    }
  },
  
  // Regras para transações
  transaction: {
    type: {
      required: true,
      type: 'string',
      enum: ['receita', 'despesa'],
      message: 'Tipo deve ser "receita" ou "despesa"'
    },
    category: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      sanitize: true,
      message: 'Categoria deve ter entre 2 e 100 caracteres'
    },
    value: {
      required: true,
      type: 'number',
      min: 0.01,
      max: 999999.99,
      message: 'Valor deve ser entre 0.01 e 999999.99'
    }
  }
};

/**
 * Valida um campo individual
 */
function validateField(value: any, rules: any, fieldName: string) {
  const errors: string[] = [];
  
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(rules.message || `${fieldName} é obrigatório`);
    return errors;
  }
  
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return errors;
  }
  
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      errors.push(`${fieldName} deve ser do tipo ${rules.type}`);
      return errors;
    }
  }
  
  let processedValue = value;
  if (rules.sanitize && typeof processedValue === 'string') {
    processedValue = sanitizeString(processedValue);
  }
  
  if (rules.minLength && processedValue.length < rules.minLength) {
    errors.push(rules.message || `${fieldName} deve ter pelo menos ${rules.minLength} caracteres`);
  }
  
  if (rules.maxLength && processedValue.length > rules.maxLength) {
    errors.push(rules.message || `${fieldName} deve ter no máximo ${rules.maxLength} caracteres`);
  }
  
  if (rules.pattern && !rules.pattern.test(processedValue)) {
    errors.push(rules.message || `${fieldName} não atende ao padrão exigido`);
  }
  
  if (rules.enum && !rules.enum.includes(processedValue)) {
    errors.push(rules.message || `${fieldName} deve ser um dos valores: ${rules.enum.join(', ')}`);
  }
  
  if (rules.min !== undefined && typeof processedValue === 'number' && processedValue < rules.min) {
    errors.push(rules.message || `${fieldName} deve ser pelo menos ${rules.min}`);
  }
  
  if (rules.max !== undefined && typeof processedValue === 'number' && processedValue > rules.max) {
    errors.push(rules.message || `${fieldName} deve ser no máximo ${rules.max}`);
  }
  
  if (rules.integer && typeof processedValue === 'number' && !Number.isInteger(processedValue)) {
    errors.push(rules.message || `${fieldName} deve ser um número inteiro`);
  }
  
  return errors;
}

/**
 * Valida objeto completo contra regras
 */
function validateObject(data: any, rules: any) {
  const errors: Record<string, string[]> = {};
  const warnings: string[] = [];
  const sanitizedData: any = {};
  
  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const value = data[fieldName];
    const fieldErrors = validateField(value, fieldRules, fieldName);
    
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
    } else {
      if ((fieldRules as any).sanitize && typeof value === 'string') {
        sanitizedData[fieldName] = sanitizeString(value);
      } else {
        sanitizedData[fieldName] = value;
      }
    }
  }
  
  for (const fieldName of Object.keys(data)) {
    if (!rules[fieldName]) {
      warnings.push(`Campo não reconhecido: ${fieldName}`);
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    sanitizedData
  };
}

/**
 * Middleware de validação genérico
 */
export const validationMiddleware = validate({});

export function validate(validationRules: any, options: any = {}) {
  const {
    sanitize = true
  } = options;
  
  return async (c: Context, next: Next) => {
    try {
      let data: any;
      const contentType = c.req.header('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await c.req.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded') || contentType?.includes('multipart/form-data')) {
        const formData = await c.req.formData();
        data = Object.fromEntries(formData.entries());
      } else {
        data = c.req.query();
      }
      
      const validation = validateObject(data, validationRules);
      
      if (!validation.isValid) {
        logger.warn('Validação falhou', {
          path: c.req.path,
          method: c.req.method,
          errors: validation.errors,
          data: sanitize ? '[SANITIZED]' : data
        });
        
        return c.json({
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors,
          warnings: validation.warnings,
          timestamp: new Date().toISOString()
        }, 400);
      }
      
      if (sanitize) {
        c.set('validatedData', validation.sanitizedData);
      } else {
        c.set('validatedData', data);
      }
      
      if (validation.warnings.length > 0) {
        c.set('validationWarnings', validation.warnings);
      }
      
      await next();
    } catch (error: any) {
      logger.error('Erro no middleware de validação', error);
      return c.json({
        success: false,
        message: 'Erro interno na validação',
        timestamp: new Date().toISOString()
      }, 500);
    }
  };
}

/**
 * Middleware de validação para produtos
 */
export const validateProduct = validate(ValidationRules.product);

/**
 * Middleware de validação para pedidos
 */
export const validateOrder = validate(ValidationRules.order);

/**
 * Middleware de validação para usuários
 */
export const validateUser = validate(ValidationRules.user);

/**
 * Middleware de validação para transações
 */
export const validateTransaction = validate(ValidationRules.transaction);

/**
 * Middleware de validação customizada
 */
export function validateCustom(rules: any, options: any = {}) {
  return validate(rules, options);
}

/**
 * Validação de CPF
 */
export function validateCpf(cpf: string) {
  if (typeof cpf !== 'string') return false;
  
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
}

/**
 * Validação de telefone
 */
export function validatePhone(phone: string) {
  if (typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Validação de email
 */
export function validateEmail(email: string) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Middleware de validação de CPF
 */
export function validateCpfField(fieldName = 'cpf') {
  return async (c: Context, next: Next) => {
    const data: any = c.get('validatedData') || {};
    const cpf = data[fieldName];
    
    if (cpf && !validateCpf(cpf)) {
      return c.json({
        success: false,
        message: 'CPF inválido',
        errors: { [fieldName]: ['CPF deve ter 11 dígitos e ser válido'] },
        timestamp: new Date().toISOString()
      }, 400);
    }
    
    await next();
  };
}

/**
 * Middleware de validação de telefone
 */
export function validatePhoneField(fieldName = 'phone') {
  return async (c: Context, next: Next) => {
    const data: any = c.get('validatedData') || {};
    const phone = data[fieldName];
    
    if (phone && !validatePhone(phone)) {
      return c.json({
        success: false,
        message: 'Telefone inválido',
        errors: { [fieldName]: ['Telefone deve ter 10 ou 11 dígitos'] },
        timestamp: new Date().toISOString()
      }, 400);
    }
    
    await next();
  };
}

/**
 * Middleware de validação de email
 */
export function validateEmailField(fieldName = 'email') {
  return async (c: Context, next: Next) => {
    const data: any = c.get('validatedData') || {};
    const email = data[fieldName];
    
    if (email && !validateEmail(email)) {
      return c.json({
        success: false,
        message: 'E-mail inválido',
        errors: { [fieldName]: ['E-mail deve ter formato válido'] },
        timestamp: new Date().toISOString()
      }, 400);
    }
    
    await next();
  };
}
