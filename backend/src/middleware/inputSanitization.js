/**
 * Middleware de Sanitização de Inputs contra XSS
 * Protege contra ataques de script injection
 */

import { logger } from '../utils/logger.js';

/**
 * Caracteres perigosos que precisam ser escapados
 */
const DANGEROUS_CHARS = {
  '<': '<',
  '>': '>',
  '"': '"',
  "'": '&#x27;',
  '/': '&#x2F;',
  '&': '&',
};

/**
 * Padrões de XSS conhecidos
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /expression\s*\(/gi,
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  /livescript:/gi,
  /mocha:/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /<input/gi,
  /<textarea/gi,
  /<select/gi,
  /<button/gi,
  /<link/gi,
  /<meta/gi,
  /<style/gi,
  /<base/gi,
  /<bgsound/gi,
  /<marquee/gi,
  /<applet/gi,
  /<xml/gi,
  /<blink/gi,
  /<spacer/gi,
  /<layer/gi,
  /<ilayer/gi,
  /<head/gi,
  /<body/gi,
  /<html/gi,
  /<frameset/gi,
  /<frame/gi,
  /<noframes/gi,
  /<noscript/gi,
  /<title/gi,
  /<comment/gi,
  /<image/gi,
  /<img/gi,
  /<svg/gi,
  /<math/gi,
  /<audio/gi,
  /<video/gi,
  /<source/gi,
  /<track/gi,
  /<map/gi,
  /<area/gi,
  /<table/gi,
  /<caption/gi,
  /<col/gi,
  /<colgroup/gi,
  /<tr/gi,
  /<td/gi,
  /<th/gi,
  /<thead/gi,
  /<tbody/gi,
  /<tfoot/gi,
  /<fieldset/gi,
  /<legend/gi,
  /<label/gi,
  /<output/gi,
  /<progress/gi,
  /<meter/gi,
  /<details/gi,
  /<summary/gi,
  /<menuitem/gi,
  /<menu/gi,
  /<dialog/gi,
  /<font/gi,
  /<center/gi,
  /<big/gi,
  /<strike/gi,
  /<tt/gi,
  /<acronym/gi,
  /<abbr/gi,
  /<bdo/gi,
  /<dfn/gi,
  /<kbd/gi,
  /<samp/gi,
  /<var/gi,
  /<cite/gi,
  /<del/gi,
  /<ins/gi,
  /<u/gi,
  /<s/gi,
  /<i/gi,
  /<b/gi,
  /<small/gi,
  /<sub/gi,
  /<sup/gi,
  /<pre/gi,
  /<code/gi,
  /<blockquote/gi,
  /<q/gi,
  /<em/gi,
  /<strong/gi,
  /<h[1-6]/gi,
  /<p/gi,
  /<div/gi,
  /<span/gi,
  /<a/gi,
  /<ul/gi,
  /<ol/gi,
  /<li/gi,
  /<dl/gi,
  /<dt/gi,
  /<dd/gi,
  /<address/gi,
  /<hr/gi,
  /<br/gi,
  /<wbr/gi,
];

/**
 * Sanitiza uma string removendo scripts e tags perigosas
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  let sanitized = str;
  
  // Remove scripts e tags perigosas
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Escapa caracteres perigosos
  for (const [char, escaped] of Object.entries(DANGEROUS_CHARS)) {
    sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escaped);
  }
  
  // Remove null bytes e caracteres de controle
  sanitized = sanitized.replace(/\0/g, '');
  // Remove null bytes e caracteres de controle
  sanitized = sanitized.replace(/\0/g, '');
  // Usando códigos de caracteres para evitar alertas de caracteres de controle literais em strings
  const controlCharsRange = String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + '-' + String.fromCharCode(159);
  const controlCharsRegex = new RegExp('[' + controlCharsRange + ']', 'g');
  sanitized = sanitized.replace(controlCharsRegex, '');
  
  return sanitized.trim();
}

/**
 * Sanitiza um objeto recursivamente
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitiza a chave também
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware para sanitizar inputs de requisições
 */
export function sanitizeInputs(_c, _next) {
  return async (c, next) => {
    try {
      // Sanitiza query parameters
      if (c.req.query) {
        const sanitizedQuery = sanitizeObject(c.req.query);
        c.req.query = sanitizedQuery;
      }
      
      // Sanitiza body parameters
      if (c.req.body) {
        const contentType = c.req.header('content-type');
        
        if (contentType?.includes('application/json')) {
          try {
            const body = await c.req.json();
            const sanitizedBody = sanitizeObject(body);
            c.req.body = sanitizedBody;
          } catch {
            // Se não conseguir parsear como JSON, sanitiza como string
            const bodyText = await c.req.text();
            const sanitizedText = sanitizeString(bodyText);
            c.req.body = sanitizedText;
          }
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await c.req.formData();
          const sanitizedFormData = new FormData();
          
          for (const [key, value] of formData.entries()) {
            const sanitizedKey = sanitizeString(key);
            const sanitizedValue = typeof value === 'string' ? sanitizeString(value) : value;
            sanitizedFormData.append(sanitizedKey, sanitizedValue);
          }
          
          c.req.body = sanitizedFormData;
        }
      }
      
      // Sanitiza headers suspeitos
      const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'user-agent', 'referer'];
      for (const header of suspiciousHeaders) {
        const value = c.req.header(header);
        if (value) {
          const sanitizedValue = sanitizeString(value);
          // Não podemos modificar os headers diretamente, mas podemos logar
          if (sanitizedValue !== value) {
            logger.warn('Header suspeito sanitizado', {
              header,
              original: value.substring(0, 100),
              sanitized: sanitizedValue.substring(0, 100)
            });
          }
        }
      }
      
      await next();
    } catch (error) {
      logger.error('Erro na sanitização de inputs', error);
      await next();
    }
  };
}

/**
 * Middleware para sanitizar outputs de respostas
 */
export function sanitizeOutputs(_c, _next) {
  return async (c, next) => {
    await next();
    
    try {
      // Sanitiza headers de resposta
      const responseHeaders = c.res.headers;
      const contentType = responseHeaders.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Sanitiza JSON responses
        const response = c.res.clone();
        const body = await response.json();
        const sanitizedBody = sanitizeObject(body);
        
        // Cria nova resposta com body sanitizado
        const sanitizedResponse = new Response(JSON.stringify(sanitizedBody), {
          status: c.res.status,
          statusText: c.res.statusText,
          headers: c.res.headers
        });
        
        c.res = sanitizedResponse;
      }
    } catch (error) {
      // Se falhar na sanitização do output, não quebra a resposta
      logger.warn('Falha na sanitização do output', { error: error.message });
    }
  };
}

/**
 * Middleware combinado para sanitização completa
 */
export function fullSanitization(_c, _next) {
  return [
    sanitizeInputs,
    sanitizeOutputs
  ];
}

/**
 * Validação de Content-Type
 */
export function validateContentType(allowedTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded']) {
  return async (c, next) => {
    const contentType = c.req.header('content-type');
    const method = c.req.method;
    
    // Só valida Content-Type para métodos que enviam body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!contentType) {
        logger.warn('Content-Type ausente', { method, path: c.req.path });
        return c.json({ error: 'Content-Type é obrigatório' }, 400);
      }
      
      const isValid = allowedTypes.some(type => contentType.includes(type));
      if (!isValid) {
        logger.warn('Content-Type não permitido', { 
          method, 
          path: c.req.path, 
          contentType,
          allowedTypes 
        });
        return c.json({ error: 'Content-Type não suportado' }, 415);
      }
    }
    
    await next();
  };
}

/**
 * Middleware para detectar e bloquear payloads muito grandes
 */
export function limitPayloadSize(maxSize = 1024 * 1024) { // 1MB por padrão
  return async (c, next) => {
    const contentLength = c.req.header('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn('Payload muito grande', {
        contentLength,
        maxSize,
        path: c.req.path,
        method: c.req.method
      });
      return c.json({ error: 'Payload muito grande' }, 413);
    }
    
    await next();
  };
}

/**
 * Middleware para detectar e bloquear tentativas de SQL Injection
 */
export function detectSqlInjection(_c, _next) {
  return async (c, next) => {
    const suspiciousPatterns = [
      /%27|'|--|%23|#/gi,
      /%3D|=.*?(%27|'|--|%3B|;)/gi,
      /\w*(%27|')(%6F|o|%4F)(%72|r|%52)/gi,
      /(%27|')union/gi,
      /exec(\s|\+)+(s|x)p\w+/gi,
      /UNION.*?SELECT/gi,
      /SELECT.*?FROM/gi,
      /INSERT.*?INTO/gi,
      /DELETE.*?FROM/gi,
      /UPDATE.*?SET/gi,
      /DROP.*?TABLE/gi,
      /ALTER.*?TABLE/gi,
      /CREATE.*?TABLE/gi,
    ];
    
    const checkValue = (value) => {
      if (typeof value !== 'string') return false;
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
      return false;
    };
    
    const checkObject = (obj) => {
      if (obj === null || obj === undefined) return false;
      
      if (typeof obj === 'string') {
        return checkValue(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.some(item => checkObject(item));
      }
      
      if (typeof obj === 'object') {
        return Object.values(obj).some(value => checkObject(value));
      }
      
      return false;
    };
    
    // Verifica query parameters
    if (c.req.query && checkObject(c.req.query)) {
      logger.warn('Tentativa de SQL Injection detectada', {
        type: 'query',
        path: c.req.path,
        ip: c.req.header('cf-connecting-ip') || '127.0.0.1'
      });
      return c.json({ error: 'Requisição inválida' }, 400);
    }
    
    // Verifica body
    if (c.req.body && checkObject(c.req.body)) {
      logger.warn('Tentativa de SQL Injection detectada', {
        type: 'body',
        path: c.req.path,
        ip: c.req.header('cf-connecting-ip') || '127.0.0.1'
      });
      return c.json({ error: 'Requisição inválida' }, 400);
    }
    
    await next();
  };
}

/**
 * Middleware para detectar e bloquear tentativas de Path Traversal
 */
export function detectPathTraversal(_c, _next) {
  return async (c, next) => {
    const suspiciousPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%252e%252e%252f/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /%2e%2e%5c/gi,
      /%252e%252e%255c/gi,
    ];
    
    const checkValue = (value) => {
      if (typeof value !== 'string') return false;
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
      return false;
    };
    
    const checkObject = (obj) => {
      if (obj === null || obj === undefined) return false;
      
      if (typeof obj === 'string') {
        return checkValue(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.some(item => checkObject(item));
      }
      
      if (typeof obj === 'object') {
        return Object.values(obj).some(value => checkObject(value));
      }
      
      return false;
    };
    
    // Verifica path
    if (checkValue(c.req.path)) {
      logger.warn('Tentativa de Path Traversal detectada', {
        type: 'path',
        path: c.req.path,
        ip: c.req.header('cf-connecting-ip') || '127.0.0.1'
      });
      return c.json({ error: 'Caminho inválido' }, 400);
    }
    
    // Verifica query parameters
    if (c.req.query && checkObject(c.req.query)) {
      logger.warn('Tentativa de Path Traversal detectada', {
        type: 'query',
        path: c.req.path,
        ip: c.req.header('cf-connecting-ip') || '127.0.0.1'
      });
      return c.json({ error: 'Requisição inválida' }, 400);
    }
    
    await next();
  };
}