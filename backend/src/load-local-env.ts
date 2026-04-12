// ARCH-03: Todas as importações Node.js são condicionais para compatibilidade com Workers
let devVarsPath: string | null = null;
let fsModule: any = null;

try {
  // Use a stronger check for Node.js environment or dynamic import behavior
  if (typeof process !== 'undefined' && process.release && process.release.name === 'node') {
    fsModule = await import('fs');
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');

    const currentUrl = import.meta.url;
    if (currentUrl) {
      const backendRoot = join(dirname(fileURLToPath(currentUrl)), '..');
      devVarsPath = join(backendRoot, '.dev.vars');
    }
  }
} catch {
  // Ignora erro em ambientes sem suporte a Node.js (Workers runtime)
}

export function loadLocalEnv(): void {
  try {
    if (!devVarsPath || !fsModule || !fsModule.existsSync(devVarsPath)) return;

    const content = fsModule.readFileSync(devVarsPath, 'utf8');

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
  } catch {
    // Ignora erros de filesystem em produção
  }
}

export function getRequiredEnv(cOrName: any, name?: string): string {
  // Se apenas um argumento for passado, cOrName é o nome
  const targetName = name || cOrName;
  const context = name ? cOrName : null;

  const value = context?.env?.[targetName] || process.env[targetName];

  if (!value) {
    throw new Error(`${targetName} não definido nas variáveis de ambiente`);
  }
  return value;
}
