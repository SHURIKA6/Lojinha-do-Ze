import { Bindings, Database } from '../../core/types';
import { logger } from '../../core/utils/logger';

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

    // 3. Chamar Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
        }),
      }
    );

    if (!response.ok) throw new Error('Gemini API Error');

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Opa, me distraí aqui com o café. Pode repetir?';

  } catch (error) {
    logger.error('Erro no Assistente AI do WhatsApp', error as Error);
    return 'Oi! O Seu Zé está conferindo o estoque agora, mas já te responde. Como posso ajudar?';
  }
}
