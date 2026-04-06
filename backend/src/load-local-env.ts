import { Context } from 'hono';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Carrega variáveis de ambiente de um arquivo .env para scripts locais / testes
 */
export function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
  
  dotenv.config({ path: envPath });
  dotenv.config({ path: devVarsPath });
}

/**
 * Obtém uma variável de ambiente obrigatória do contexto do Hono (Cloudflare Workers)
 * @param c Contexto do Hono
 * @param key Nome da variável
 * @returns O valor da variável
 * @throws Erro se a variável não estiver definida
 */
export function getRequiredEnv(c: any, key?: string): string {
  const envKey = key || c;
  const isCContext = c && typeof c === 'object' && ('env' in c || 'get' in c);
  
  let value: string | undefined;
  
  if (isCContext) {
    // Try c.env first (Cloudflare Workers bindings)
    value = c.env?.[envKey];
    
    // Then try process.env as fallback
    if (!value) {
      value = process.env[envKey];
    }

    // Finally try c directly if it's a simple object
    if (!value && typeof c === 'object') {
      value = c[envKey];
    }
  } else {
    // If c is not a context, try process.env directly
    value = process.env[envKey];
  }
  
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${envKey}`);
  }
  
  return value;
}

export function getOptionalEnv(c: any, keyOrData?: any, defaultValue: string = ''): string {
  const isGlobal = typeof keyOrData === 'undefined' || (typeof keyOrData === 'string' && arguments.length === 2);
  // This is getting complex. Let's stick to a simpler version.
  if (typeof c === 'string') {
    return process.env[c] || (keyOrData as string) || '';
  }
  const envSource = c.env || c;
  return envSource[keyOrData] || defaultValue;
}
