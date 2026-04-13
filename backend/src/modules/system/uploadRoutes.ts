import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../../core/middleware/auth';
import { randomToken } from '../../core/utils/crypto';
import { jsonError } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { validateFileSignature } from '../../core/utils/file';
import { Bindings, Variables } from '../../core/types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
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

    const bucket = (c.env as any).BUCKET;
    if (!bucket) {
      logger.error('O binding do bucket R2 não está configurado');
      return jsonError(c, 500, 'R2 Bucket não configurado no servidor.');
    }

    const fileName = `products/${Date.now()}-${randomToken(10)}.${extension}`;
    const fileBuffer = await file.arrayBuffer();

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
    logger.error('Erro no Upload', error as Error);
    return jsonError(c, 500, 'Erro ao fazer upload da imagem');
  }
});

router.get('/products/:filename', async (c) => {
  try {
    const paramFilename = c.req.param('filename');
    const sanitized = paramFilename.replace(/[^a-zA-Z0-9._-]/g, '');
    
    if (sanitized !== paramFilename || paramFilename.includes('..')) {
      logger.warn('Bloqueada tentativa potencial de path traversal', { filename: paramFilename });
      return c.text('Bad Request', 400);
    }

    const filename = `products/${sanitized}`;
    const bucket = (c.env as any).BUCKET;

    if (!bucket) {
      return c.text('Not Found', 404);
    }

    const object = await bucket.get(filename);
    if (!object) {
      return c.text('Not Found', 404);
    }

    const headers = new Headers();
    if (object.writeHttpMetadata) {
      object.writeHttpMetadata(headers);
    }
    
    if (object.httpEtag) {
      headers.set('etag', object.httpEtag);
    }
    
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, { headers });
  } catch (error) {
    logger.error('Erro no GET de Upload', error as Error, { filename: c.req.param('filename') });
    return c.text('Internal Error', 500);
  }
});

export default router;
