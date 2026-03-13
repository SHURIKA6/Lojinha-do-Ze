import { Hono } from 'hono';
import { adminOnly, authMiddleware, csrfMiddleware } from '../middleware/auth.js';
import { randomToken } from '../utils/crypto.js';
import { jsonError } from '../utils/http.js';

const router = new Hono();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

router.post('/', authMiddleware, adminOnly, csrfMiddleware, async (c) => {
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
      console.error('R2 bucket binding is not configured.');
      return jsonError(c, 500, 'R2 Bucket não configurado no servidor.');
    }

    const fileName = `products/${Date.now()}-${randomToken(10)}.${extension}`;

    await bucket.put(fileName, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return c.json({
      url: `/api/upload/${fileName}`,
      message: 'Upload concluído com sucesso',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return jsonError(c, 500, 'Erro ao fazer upload da imagem');
  }
});

router.get('/products/:filename', async (c) => {
  try {
    const filename = `products/${c.req.param('filename')}`;
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
    console.error('Upload GET error:', error);
    return c.text('Internal Error', 500);
  }
});

export default router;
