const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Gera um token aleatório criptograficamente seguro em formato hexadecimal.
 * @param byteLength - O número de bytes a gerar (padrão: 32).
 * @returns Uma string hexadecimal representando os bytes aleatórios.
 */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Gera um código alfanumérico aleatório criptograficamente seguro.
 * Usa um alfabeto seguro para URL excluindo caracteres ambíguos (sem 0, 1, I, O).
 * @param length - O comprimento do código a gerar (padrão: 8).
 * @returns Uma string de código alfanumérico aleatório.
 */
export function randomCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

/**
 * Calcula o hash SHA-256 de uma string e retorna como uma string hexadecimal.
 * @param value - A string de entrada a ser hasheada.
 * @returns Uma Promise que resolve para a representação hexadecimal do hash SHA-256.
 */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Faz o hash de uma senha usando PBKDF2 com SHA-256.
 * Usa um salt aleatório de 16 bytes e 100.000 iterações.
 * Otimizado para os limites de CPU do Cloudflare Workers Free Plan.
 * @param password - A senha em texto plano a ser hasheada.
 * @returns Uma Promise que resolve para uma string no formato "salt:hash" em hexadecimal.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(derivedBits))}`;
}

/**
 * Verifica uma senha contra um hash armazenado usando comparação em tempo constante.
 * Protege contra ataques de temporização usando comparação baseada em XOR.
 * @param password - A senha em texto plano a ser verificada.
 * @param storedHash - O hash armazenado no formato hexadecimal "salt:hash".
 * @returns Uma Promise que resolve para true se a senha corresponder, false caso contrário.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = hexToBytes(saltHex);
  const originalHash = hexToBytes(hashHex);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const newHash = new Uint8Array(derivedBits);
  if (newHash.length !== originalHash.length) return false;

  // Constant-time comparison to prevent timing attacks
  let diff = 0;
  for (let i = 0; i < newHash.length; i++) {
    diff |= newHash[i] ^ originalHash[i];
  }
  return diff === 0;
}
