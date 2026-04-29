import { Bindings } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { normalizePhoneDigits } from '../../core/utils/normalize';

export async function sendWhatsAppMessage(env: Bindings, to: string, message: string): Promise<void> {
  const apiType = env.WHATSAPP_API_TYPE || 'evolution';
  const cleanPhone = normalizePhoneDigits(to);
  
  // WhatsApp requires country code. Assuming Brazil (55) if not present
  const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

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
      linkPreview: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolution API error (${response.status}): ${errorText}`);
  }
}

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
