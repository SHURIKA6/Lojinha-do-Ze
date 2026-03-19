/**
 * Utilitário para verificar assinaturas de arquivos (magic bytes) por segurança.
 */

const MAGIC_BYTES = {
  // JPEG: FF D8 FF
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  // WEBP: 52 49 46 46 (seguido por WEBP no índice 8)
  webp: [0x52, 0x49, 0x46, 0x46],
};

/**
 * Valida se o buffer corresponde à assinatura da extensão de arquivo esperada.
 * @param {ArrayBuffer} buffer 
 * @param {string} extension 
 * @returns {boolean}
 */
export function validateFileSignature(buffer, extension) {
  const bytes = new Uint8Array(buffer);
  const signature = MAGIC_BYTES[extension.toLowerCase()];
  
  if (!signature) return false;

  // Verifica os bytes iniciais
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }

  // Verificação extra para WebP (necessita 'WEBP' no índice 8)
  if (extension.toLowerCase() === 'webp') {
    const webpHeader = String.fromCharCode(...bytes.slice(8, 12));
    if (webpHeader !== 'WEBP') return false;
  }

  return true;
}
