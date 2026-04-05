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
  const isGlobal = typeof key === 'undefined';
  const envKey = isGlobal ? c : key;
  const envSource = isGlobal ? process.env : (c.env || c);
  const value = envSource[envKey];
  
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
