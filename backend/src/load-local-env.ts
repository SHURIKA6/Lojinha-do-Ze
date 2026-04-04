import { Context } from 'hono';

/**
 * Obtém uma variável de ambiente obrigatória do contexto do Hono (Cloudflare Workers)
 * @param c Contexto do Hono
 * @param key Nome da variável
 * @returns O valor da variável
 * @throws Erro se a variável não estiver definida
 */
export function getRequiredEnv(c: Context | any, key: string): string {
  const env = (c as any).env || c.env;
  const value = env ? env[key] : process.env[key];
  
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
  
  return value;
}

/**
 * Obtém uma variável de ambiente opcional
 * @param c Contexto do Hono
 * @param key Nome da variável
 * @param defaultValue Valor padrão se não encontrada
 * @returns O valor ou o padrão
 */
export function getOptionalEnv(c: Context | any, key: string, defaultValue: string = ''): string {
  const env = (c as any).env || c.env;
  const value = env ? env[key] : process.env[key];
  
  return value || defaultValue;
}
