import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth.js';
import { randomToken } from '../utils/crypto.js';
import { jsonError } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { validateFileSignature } from '../utils/file.js';

const router = new Hono();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

router.post('/', authMiddleware, adminOnly, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return jsonError(c, 400, 'Nenhum arquivo de imagem válido foi enviado.');
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type];
    if (!extension) {
      return jsonError(c, 400, 'Envie apenas imagens JPG, PNG ou WEBP.');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError(c, 400, 'A imagem deve ter no máximo 5 MB.');
    }

    const bucket = c.env.BUCKET;
    if (!bucket) {
      logger.error('O binding do bucket R2 não está configurado');
      return jsonError(c, 500, 'R2 Bucket não configurado no servidor.');
    }

    const fileName = `products/${Date.now()}-${randomToken(10)}.${extension}`;
    const fileBuffer = await file.arrayBuffer();

    // Valida com segurança a assinatura do arquivo (magic bytes) para prevenir spoofing
    if (!validateFileSignature(fileBuffer, extension)) {
      logger.warn('Tentativa de upload bloqueada com assinatura de arquivo inválida', {
        filename: file.name,
        type: file.type,
        extension,
      });
      return jsonError(c, 400, 'O conteúdo do arquivo não corresponde à sua extensão.');
    }

    await bucket.put(fileName, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return c.json({
      url: `/api/upload/${fileName}`,
      message: 'Upload concluído com sucesso',
    });
  } catch (error) {
    logger.error('Erro no Upload', error);
    return jsonError(c, 500, 'Erro ao fazer upload da imagem');
  }
});

router.get('/products/:filename', async (c) => {
  try {
    const paramFilename = c.req.param('filename');
    
    // Sanitização aprimorada para prevenir path traversal
    // Permite apenas caracteres alfanuméricos, pontos, hifens e sublinhados. 
    // Bloqueia especificamente '..' e quaisquer barras.
    const sanitized = paramFilename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (sanitized !== paramFilename || paramFilename.includes('..')) {
      logger.warn('Bloqueada tentativa potencial de path traversal', { filename: paramFilename });
      return c.text('Bad Request', 400);
    }

    const filename = `products/${sanitized}`;
    const bucket = c.env.BUCKET;

    if (!bucket) {
      return c.text('Not Found', 404);
    }

    const object = await bucket.get(filename);
    if (!object) {
      return c.text('Not Found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, { headers });
  } catch (error) {
    logger.error('Erro no GET de Upload', error, { filename: c.req.param('filename') });
    return c.text('Internal Error', 500);
  }
});

export default router;
