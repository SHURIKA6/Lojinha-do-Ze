import { Hono } from 'hono';
import { logger } from '../utils/logger';
import { getRequiredEnv } from '../load-local-env';
import { authMiddleware, adminOnly } from '../middleware/auth';
import { Bindings, Variables } from '../types';

const aiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// SEC-03: Proteção obrigatória para rotas administrativas de IA
aiRoutes.post('/chat', authMiddleware, adminOnly, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as any;
    const message = body.message;
    
    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Mensagem inválida ou ausente.' }, 400);
    }

    let apiKey: string;
    try {
      apiKey = getRequiredEnv(c as any, 'GEMINI_API_KEY');
    } catch (err) {
      logger.error('Config Error: GEMINI_API_KEY not found', err as Error);
      return c.json({ error: 'Chave da API do Gemini não configurada no servidor.' }, 500);
    }

    logger.info('Iniciando consulta ao Guardião da Lojinha...', { messageLength: message.length });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Você é o "Guardião da Lojinha", um assistente místico e inteligente da "Lojinha do Zé", um e-commerce de produtos naturais e artesanais.
                  Seu objetivo é ajudar o administrador com dados da loja, dicas de marketing e suporte. 
                  Mantenha um tom profissional, porém leve e levemente rústico (como um conselheiro sábio).
                  Responda de forma concisa em português do Brasil.
                  
                  Pergunta do usuário: ${message}`
                }
              ]
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      logger.error('Gemini API HTTP Error:', { 
        status: response.status, 
        error: errorData.error || 'Unknown Error' 
      } as any);
      
      const errorMessage = response.status === 404 
        ? 'Modelo de IA não encontrado ou indisponível.' 
        : 'A sabedoria da IA está temporariamente indisponível.';
        
      return c.json({ error: errorMessage, details: errorData.error }, 503);
    }

    const data = await response.json() as any;
    
    if (data.error) {
      logger.error('Gemini API Application Error:', data.error);
      return c.json({ error: 'Erro ao consultar a sabedoria da IA.' }, 500);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'O Guardião está meditativo agora. Tente perguntar de outra forma.';

    logger.info('Resposta do Guardião obtida com sucesso.');
    return c.json({ reply });
  } catch (err) {
    logger.error('AI Route Critical Error:', err as Error);
    return c.json({ error: 'Conexão mística interrompida por erro interno.' }, 500);
  }
});

export default aiRoutes;
