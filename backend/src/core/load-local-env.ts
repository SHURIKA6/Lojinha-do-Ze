import dotenv from 'dotenv';
import process from 'node:process';

/**
 * Carrega variáveis de ambiente do arquivo .dev.vars para desenvolvimento local.
 * Utiliza dotenv para parsear o arquivo e popular process.env.
 * Falha silenciosamente em produção ou quando o arquivo não existe.
 * 
 * @returns {void}
 */
export function loadLocalEnv(): void {
  try {
    dotenv.config({ path: '.dev.vars' });
  } catch {
    // Ignora erros de filesystem em produção ou se o arquivo não existir
  }
}

/**
 * Recupera uma variável de ambiente obrigatória do contexto do Cloudflare Workers ou do process.env do Node.js.
 * Verifica primeiro o contexto do Cloudflare Workers (c.env), depois recorre ao process.env.
 * Lança um erro se a variável não estiver definida em nenhum dos locais.
 * 
 * @param {any} cOrName - Ou o objeto de contexto (com propriedade env) ou a string do nome da variável
 * @param {string} [name] - O nome da variável (quando o primeiro parâmetro é o contexto)
 * @returns {string} O valor da variável de ambiente
 * @throws {Error} Se a variável de ambiente não estiver definida
 */
export function getRequiredEnv(cOrName: any, name?: string): string {
  // Se apenas um argumento for passado, cOrName é o nome
  const targetName = name || cOrName;
  const context = name ? cOrName : null;

  const value = context?.env?.[targetName] || (typeof process !== 'undefined' ? process.env[targetName] : undefined);

  if (!value) {
    throw new Error(`${targetName} não definido nas variáveis de ambiente`);
  }
  return value;
}
