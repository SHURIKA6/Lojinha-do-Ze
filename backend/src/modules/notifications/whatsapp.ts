import { Bindings } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { normalizePhoneDigits } from '../../core/utils/normalize';

/**
 * Envia uma mensagem WhatsApp usando a API configurada (Evolution ou Official).
 * 
 * O número é normalizado automaticamente:
 * - Se já for um JID (contém @), usa diretamente
 * - Caso contrário, normaliza e adiciona prefixo 55 se necessário
 * 
 * @param env - Variáveis de ambiente com configurações da API.
 * @param to - Número de telefone do destinatário ou JID.
 * @param message - Conteúdo da mensagem a ser enviada.
 */
export async function sendWhatsAppMessage(env: Bindings, to: string, message: string): Promise<void> {
  const apiType = env.WHATSAPP_API_TYPE || 'evolution';
  // Se já for um JID completo (contém @), usamos direto. 
  // Caso contrário, normalizamos como número comum.
  const isJid = to.includes('@');
  const formattedPhone = isJid ? to : (normalizePhoneDigits(to).length <= 11 ? `55${normalizePhoneDigits(to)}` : normalizePhoneDigits(to));

  try {
    if (apiType === 'evolution') {
      await sendViaEvolution(env, formattedPhone, message);
    } else {
      await sendViaOfficial(env, formattedPhone, message);
    }
  } catch (error) {
    logger.error('WhatsApp notification failed', error as Error, { to, apiType });
  }
}

/**
 * Envia mensagem via Evolution API.
 * @param env - Variáveis de ambiente com WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_INSTANCE_NAME.
 * @param to - Número de telefone ou JID do destinatário.
 * @param message - Conteúdo da mensagem.
 */
async function sendViaEvolution(env: Bindings, to: string, message: string) {
  const url = env.WHATSAPP_API_URL;
  const apiKey = env.WHATSAPP_API_KEY;
  const instance = env.WHATSAPP_INSTANCE_NAME;

  if (!url || !apiKey || !instance) {
    logger.warn('Evolution API not configured, skipping WhatsApp notification');
    return;
  }

  const endpoint = `${url.replace(/\/$/, '')}/message/sendText/${instance}`;
  logger.info(`Chamando Evolution API: ${endpoint}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify({
      number: to,
      text: message,
      delay: 1200,
      linkPreview: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API error (${response.status}): ${errorText}`);
  }
}

/**
 * Envia mensagem via WhatsApp Official API (Meta/Facebook).
 * @param env - Variáveis de ambiente com WHATSAPP_PHONE_ID e WHATSAPP_ACCESS_TOKEN.
 * @param to - Número de telefone do destinatário.
 * @param message - Conteúdo da mensagem.
 */
async function sendViaOfficial(env: Bindings, to: string, message: string) {
  const phoneId = env.WHATSAPP_PHONE_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) {
    logger.warn('Official WhatsApp API not configured, skipping WhatsApp notification');
    return;
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: message }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Official WhatsApp API error (${response.status}): ${errorText}`);
  }
}
