/**
 * Middleware de Compressão GZIP para Cloudflare Workers
 * Reduz tamanho das respostas para melhorar performance
 */

import { Context, Next } from 'hono';
import { logger } from '../utils/logger';

// Tipos de conteúdo que devem ser comprimidos
const COMPRESSIBLE_TYPES = [
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'text/plain',
  'text/xml',
  'application/xml',
  'image/svg+xml',
];

// Tamanho mínimo para compressão (1KB)
const MIN_COMPRESSION_SIZE = 1024;

// Nível de compressão (1-9, onde 9 é máxima compressão)
const COMPRESSION_LEVEL = 6;

/**
 * Verifica se o conteúdo deve ser comprimido
 */
function shouldCompress(contentType: string | null, contentLength: string | null): boolean {
  if (!contentType || !contentLength) return false;
  
  // Verifica se o tipo de conteúdo é comprimível
  const isCompressible = COMPRESSIBLE_TYPES.some(type => 
    contentType.includes(type)
  );
  
  // Verifica se o tamanho é suficiente para compressão
  const isLargeEnough = parseInt(contentLength) >= MIN_COMPRESSION_SIZE;
  
  return isCompressible && isLargeEnough;
}

/**
 * Comprime dados usando GZIP
 */
async function compressData(data: string, _level: number = COMPRESSION_LEVEL): Promise<ArrayBuffer | null> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Usa a API de compressão do Cloudflare Workers
    const compressedStream = new Response(dataBuffer).body
      ?.pipeThrough(new CompressionStream('gzip'));
    
    if (!compressedStream) {
      return null;
    }
    
    const compressedResponse = await new Response(compressedStream).arrayBuffer();
    return compressedResponse;
  } catch (error) {
    logger.error('Erro na compressão GZIP', error as Error);
    return null;
  }
}

/**
 * Middleware de compressão GZIP
 */
export function compressionMiddleware(_c: Context, _next: Next) {
  return async (c: Context, next: Next) => {
    // Verifica se o cliente aceita gzip
    const acceptEncoding = c.req.header('accept-encoding') || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    
    if (!supportsGzip) {
      await next();
      return;
    }
    
    await next();
    
    // Verifica se a resposta deve ser comprimida
    const contentType = c.res.headers.get('content-type');
    const contentLength = c.res.headers.get('content-length');
    
    if (!shouldCompress(contentType, contentLength)) {
      return;
    }
    
    try {
      // Lê o corpo da resposta
      const responseBody = await c.res.text();
      
      // Comprime os dados
      const compressedData = await compressData(responseBody);
      
      if (!compressedData) {
        // Se a compressão falhar, retorna a resposta original
        logger.warn('Falha na compressão, retornando resposta original');
        return;
      }
      
      // Cria nova resposta comprimida
      const compressedResponse = new Response(compressedData, {
        status: c.res.status,
        statusText: c.res.statusText,
        headers: {
          ...Object.fromEntries(c.res.headers.entries()),
          'content-encoding': 'gzip',
          'content-length': compressedData.byteLength.toString(),
          'vary': 'Accept-Encoding',
        },
      });
      
      c.res = compressedResponse;
      
      // Log de compressão
      const originalSize = responseBody.length;
      const compressedSize = compressedData.byteLength;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      
      logger.debug('Resposta comprimida', {
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio}%`,
        contentType,
        path: c.req.path,
      });
      
    } catch (error) {
      // Se houver erro na compressão, não quebra a resposta
      logger.error('Erro no middleware de compressão', error as Error);
    }
  };
}

/**
 * Middleware de compressão condicional baseado no tamanho
 */
export function conditionalCompression(minSize: number = MIN_COMPRESSION_SIZE) {
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header('content-length');
    
    // Só aplica compressão se o payload for grande o suficiente
    if (contentLength && parseInt(contentLength) < minSize) {
      await next();
      return;
    }
    
    await compressionMiddleware(c, next);
  };
}

/**
 * Middleware de compressão para respostas JSON
 */
export function jsonCompression() {
  return async (c: Context, next: Next) => {
    await next();
    
    const contentType = c.res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return;
    }
    
    // Verifica se o cliente aceita gzip
    const acceptEncoding = c.req.header('accept-encoding') || '';
    if (!acceptEncoding.includes('gzip')) {
      return;
    }
    
    try {
      const responseBody = await c.res.text();
      const compressedData = await compressData(responseBody);
      
      if (!compressedData) {
        return;
      }
      
      const compressedResponse = new Response(compressedData, {
        status: c.res.status,
        statusText: c.res.statusText,
        headers: {
          ...Object.fromEntries(c.res.headers.entries()),
          'content-encoding': 'gzip',
          'content-length': compressedData.byteLength.toString(),
          'vary': 'Accept-Encoding',
        },
      });
      
      c.res = compressedResponse;
    } catch (error) {
      logger.error('Erro na compressão JSON', error as Error);
    }
  };
}