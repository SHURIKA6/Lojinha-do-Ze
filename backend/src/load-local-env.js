import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let devVarsPath = null;
try {
  const currentUrl = import.meta.url;
  if (currentUrl) {
    const backendRoot = join(dirname(fileURLToPath(currentUrl)), '..');
    devVarsPath = join(backendRoot, '.dev.vars');
  }
} catch (e) {
  // Ignora erro em ambientes sem suporte a path/url (como Workers runtime ou build)
}

export function loadLocalEnv() {
  try {
    if (!devVarsPath || !existsSync(devVarsPath)) return;

  const content = readFileSync(devVarsPath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
    }
  } catch (e) {
    // Ignora erros de filesystem em produção
  }
}

export function getRequiredEnv(c, name) {
  // Se apenas um argumento for passado, c é o nome
  const targetName = name || c;
  const context = name ? c : null;
  
  const value = context?.env?.[targetName] || process.env[targetName];
  
  if (!value) {
    throw new Error(`${targetName} não definido nas variáveis de ambiente`);
  }
  return value;
}
