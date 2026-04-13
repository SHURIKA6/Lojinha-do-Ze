import dotenv from 'dotenv';
import process from 'node:process';

export function loadLocalEnv(): void {
  try {
    dotenv.config({ path: '.dev.vars' });
  } catch {
    // Ignora erros de filesystem em produção ou se o arquivo não existir
  }
}

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
