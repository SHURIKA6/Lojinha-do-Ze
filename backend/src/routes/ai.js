import { Hono } from 'hono';
import { logger } from '../utils/logger.js';

const aiRoutes = new Hono();

aiRoutes.post('/chat', async (c) => {
  const { message } = await c.req.json();
  const apiKey = c.env.GEMINI_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'Chave da API do Gemini não configurada no servidor.' }, 500);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
                  Responda de forma concisa.
                  
                  Pergunta do usuário: ${message}`
                }
              ]
            }
          ]
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      logger.error('Gemini API Error:', data.error);
      return c.json({ error: 'Erro ao consultar a sabedoria da IA.' }, 500);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'O Guardião está meditativo agora. Tente perguntar de outra forma.';

    return c.json({ reply });
  } catch (err) {
    logger.error('AI Route Error:', err);
    return c.json({ error: 'Conexão mística interrompida.' }, 500);
  }
});

export default aiRoutes;
