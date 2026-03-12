import { Hono } from 'hono';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = new Hono();

// Securing upload routes (Only admins can upload images to R2)
router.use('/*', authMiddleware, adminOnly);

// POST /api/upload
router.post('/', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file']; // Expected to be a Blob/File from FormData

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'Nenhum arquivo de imagem válido foi enviado.' }, 400);
    }

    if (!file.type.startsWith('image/')) {
       return c.json({ error: 'Apenas imagens são permitidas.' }, 400);
    }

    // Gerar um nome único
    const ext = file.name.split('.').pop();
    const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const bucket = c.env.BUCKET;
    if (!bucket) {
      console.warn('R2 BUCKET binding not found. Falling back to local/base64 mock if needed, or failing.');
      return c.json({ error: 'R2 Bucket não configurado no servidor.' }, 500);
    }

    // Upload para o Cloudflare R2
    await bucket.put(fileName, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Como o bucket no plano gratuito tipicamente não tem public url auto-gerada sem Custom Domain,
    // podemos servir o arquivo por uma rota GET da nossa própria API workers:
    const fileUrl = `/api/upload/${fileName}`;

    return c.json({ url: fileUrl, message: 'Upload concluído com sucesso' });
  } catch (err) {
    console.error('Upload Error:', err);
    return c.json({ error: 'Erro ao fazer upload da imagem' }, 500);
  }
});

// GET /api/upload/products/:filename (Servir imagens do R2)
// Essa rota é PÚBLICA (qualquer um pode ver as fotos do catálogo)
router.get('/products/:filename', async (c) => {
  try {
    const filename = `products/${c.req.param('filename')}`;
    const bucket = c.env.BUCKET;
    
    if (!bucket) return c.text('Not Found', 404);

    const object = await bucket.get(filename);
    
    if (object === null) {
      return c.text('Not Found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache 1 ano

    return new Response(object.body, { headers });
  } catch(err) {
    return c.text('Internal Error', 500);
  }
});

export default router;
