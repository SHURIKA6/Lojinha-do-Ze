import { Bindings, Database } from '../../core/types';
import { logger } from '../../core/utils/logger';

/**
 * Módulo de Assistente AI para Integração com WhatsApp
 * Fornece manipulação de conversas com IA para mensagens de WhatsApp.
 * Usa a API Google Gemini para gerar respostas contextuais como "Seu Zé",
 * a persona amigável do dono da loja.
 */

/**
 * Faz uma chamada ao Gemini com retry automático em caso de rate limit (429).
 * @param {string} url - A URL da API Gemini com a chave API
 * @param {object} body - O corpo da requisição a ser enviado para a API Gemini
 * @param {number} maxRetries - Número máximo de tentativas de retry (padrão: 2)
 * @returns {Promise<Response>} A resposta da API após as tentativas
 */
async function callGeminiWithRetry(url: string, body: object, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < maxRetries) {
      // Rate limit: espera antes de tentar novamente
      const waitMs = (attempt + 1) * 5000; // 5s, 10s
      logger.warn(`Gemini rate limit hit, retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    return response;
  }

  // Fallback (não deve chegar aqui)
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Processes incoming WhatsApp messages using AI (Google Gemini).
 * Retrieves product context from database, builds a contextual prompt,
 * and generates a response as "Seu Zé" persona. Supports both admin
 * and customer contexts with different information visibility.
 * @param {Database} db - A instância do banco de dados para consultar produtos
 * @param {Bindings} env - Bindings de ambiente contendo chaves API e números de telefone
 * @param {string} customerPhone - O número de telefone do cliente (WhatsApp JID)
 * @param {string} userMessage - O texto da mensagem enviada pelo usuário
 * @param {boolean} isAdmin - Indica se o remetente é um administrador (padrão: false)
 * @returns {Promise<string>} A mensagem de resposta gerada pela IA
 */
export async function processWhatsAppWithAI(
  db: Database,
  env: Bindings,
  customerPhone: string,
  userMessage: string,
  isAdmin: boolean = false
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.warn('AI Assistant: GEMINI_API_KEY not configured');
    return 'Olá! No momento estamos com muita demanda, mas o Seu Zé já vai te atender. Como posso ajudar?';
  }

  try {
    // 1. Buscar informações contextuais da loja (Produtos em destaque, categorias, etc)
    // Se for admin, buscamos também a quantidade em estoque e custo
    const query = isAdmin 
      ? `SELECT name, sale_price, category, quantity, min_stock FROM products LIMIT 20`
      : `SELECT name, sale_price, category FROM products WHERE is_active = true LIMIT 12`;

    const { rows: products } = await db.query(query);

    const productContext = products.map((p: any) => {
      let info = `- ${p.name} (${p.category}): R$ ${p.sale_price}`;
      if (isAdmin) {
        info += ` | Estoque: ${p.quantity} (Mín: ${p.min_stock})`;
      }
      return info;
    }).join('\n');

    // 2. Montar Prompt para o Gemini
    const prompt = `
      Você é o "Seu Zé", dono da "Lojinha do Zé", um senhor muito simpático, honesto e conhecedor de ervas e produtos naturais.
      Você está atendendo um cliente pelo WhatsApp. Seu tom deve ser prestativo, simples e rústico (use termos como "meu filho", "veja bem", "com certeza").
      
      Informações da Loja:
      - Endereço: Rua das Ervas, 123, Centro.
      - Horário: Segunda a Sexta, das 08h às 18h. Sábados até as 12h.
      - Site: https://lojinhadoze.com
      
      Alguns dos nossos produtos hoje:
      ${productContext}
      
      Regras:
      - Se o cliente perguntar sobre um pedido, diga para ele enviar o número do pedido.
      - Se não souber algo, peça para ele aguardar um pouquinho que você vai conferir no caderninho (atendimento humano).
      - Responda sempre em português, de forma curta e amigável.
      
      Mensagem do ${isAdmin ? 'Administrador (Zé)' : 'Cliente'}: "${userMessage}"
      
      Regras de Contexto:
      ${isAdmin 
        ? '- O usuário é o DONO (Zé). Você pode passar detalhes técnicos de estoque e avisar o que está acabando.' 
        : '- O usuário é um CLIENTE. NUNCA revele quantidades exatas de estoque ou preços de custo.'}

      Resposta do Seu Zé:
    `;

    // 3. Chamar Gemini API com retry automático para rate limits
    const cleanApiKey = apiKey.trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanApiKey}`;

    const response = await callGeminiWithRetry(geminiUrl, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Gemini API Error [${response.status}]: ${errorText}`);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Opa, me distraí aqui com o café. Pode repetir?';

  } catch (error) {
    logger.error('Erro no Assistente AI do WhatsApp', error as Error);
    return 'Oi! O Seu Zé está conferindo o estoque agora, mas já te responde. Como posso ajudar?';
  }
}
