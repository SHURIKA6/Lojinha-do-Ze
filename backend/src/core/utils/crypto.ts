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

/**
 * Gera uma chave AES-256-GCM para criptografia de dados PII (Personally Identifiable Information).
 * Usa o crypto.subtle.generateKey para criar uma chave simétrica segura de 256 bits.
 * @returns Uma Promise que resolve para um CryptoKey utilizável para criptografia e descriptografia.
 */
export async function generatePIIKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable - necessário para armazenar/exportar a chave
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa dados PII (CPF, telefone, endereço, e-mail) usando AES-256-GCM.
 * Gera um IV aleatório de 12 bytes (recomendado para GCM) e separa o auth tag do ciphertext.
 * @param data - O dado em texto plano a ser criptografado (ex: CPF, telefone, e-mail).
 * @param key - A CryptoKey AES-256-GCM para criptografia.
 * @returns Uma Promise que resolve para uma string no formato "iv:encryptedData:authTag" em hexadecimal.
 */
export async function encryptPII(data: string, key: CryptoKey): Promise<string> {
  // Gera um IV aleatório de 12 bytes (96 bits) - recomendado para AES-GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Criptografa os dados usando AES-GCM
  // O resultado inclui o ciphertext seguido do auth tag (16 bytes por padrão)
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoder.encode(data)
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);

  // O AES-GCM anexa o auth tag (16 bytes) ao final do ciphertext
  // Separamos o ciphertext do auth tag
  const authTagLength = 16; // 128 bits padrão para GCM
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - authTagLength);
  const authTag = encryptedBytes.slice(encryptedBytes.length - authTagLength);

  // Retorna no formato "iv:encryptedData:authTag" em hexadecimal
  return `${bytesToHex(iv)}:${bytesToHex(ciphertext)}:${bytesToHex(authTag)}`;
}

/**
 * Descriptografa dados PII previamente criptografados com AES-256-GCM.
 * Espera uma string no formato "iv:encryptedData:authTag" em hexadecimal.
 * @param encryptedData - A string criptografada no formato "iv:encryptedData:authTag" em hexadecimal.
 * @param key - A CryptoKey AES-256-GCM para descriptografia.
 * @returns Uma Promise que resolve para o dado original em texto plano.
 * @throws Error se o formato dos dados criptografados for inválido ou se a descriptografia falhar.
 */
export async function decryptPII(encryptedData: string, key: CryptoKey): Promise<string> {
  // Divide a string nos três componentes: IV, ciphertext e auth tag
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de dados criptografados inválido. Esperado: "iv:encryptedData:authTag"');
  }

  const [ivHex, ciphertextHex, authTagHex] = parts;

  // Converte os componentes hexadecimais de volta para bytes
  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);
  const authTag = hexToBytes(authTagHex);

  // Reconstrói o buffer completo (ciphertext + auth tag) para o Web Crypto API
  const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
  encryptedBuffer.set(ciphertext);
  encryptedBuffer.set(authTag, ciphertext.length);

  // Descriptografa os dados
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedBuffer
  );

  // Converte o resultado de volta para string
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Obtém a chave de criptografia PII do ambiente ou gera uma nova se não estiver definida.
 * Em produção (Cloudflare Workers), a chave deve estar configurada como secret PII_KEY (formato JWK JSON).
 * Em desenvolvimento local, pode ser carregada do .dev.vars ou uma chave temporária será gerada.
 * @returns Uma Promise que resolve para a CryptoKey AES-256-GCM para PII.
 */
export async function getPIIKey(): Promise<CryptoKey> {
  // Tenta obter a chave do ambiente (Cloudflare Workers ou Node.js)
  const envKey = typeof process !== 'undefined' ? process.env.PII_KEY : undefined;
  
  if (envKey) {
    try {
      // A chave está armazenada no formato JWK (JSON Web Key)
      const jwk = JSON.parse(envKey);
      return await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Erro ao importar PII_KEY do ambiente:', error);
      throw new Error('PII_KEY inválida. Certifique-se de que está no formato JWK correto.');
    }
  }
  
  // Se não há chave no ambiente, gera uma nova (apenas para desenvolvimento/testes)
  // Em produção, isso deve ser evitado - configure sempre a PII_KEY como secret
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(
      'AVISO: PII_KEY não definida no ambiente. Gerando chave temporária para desenvolvimento. ' +
      'Configure PII_KEY como secret em produção!'
    );
    return generatePIIKey();
  }
  
  throw new Error('PII_KEY não definida nas variáveis de ambiente. Configure o secret no Cloudflare ou .dev.vars');
}

/**
 * Exporta uma CryptoKey para formato JWK (JSON Web Key) para armazenamento.
 * Útil para gerar a PII_KEY que deve ser configurada como secret.
 * @param key - A CryptoKey a ser exportada.
 * @returns Uma Promise que resolve para a string JSON do JWK.
 */
export async function exportPIIKeyToJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}
