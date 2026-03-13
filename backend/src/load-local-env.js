import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const devVarsPath = join(backendRoot, '.dev.vars');

export function loadLocalEnv() {
  if (!existsSync(devVarsPath)) return;

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
}

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não definido nas variáveis de ambiente`);
  }
  return value;
}
