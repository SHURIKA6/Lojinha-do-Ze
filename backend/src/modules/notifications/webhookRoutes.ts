import { Hono } from 'hono';
import { Bindings, Variables } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { processWhatsAppWithAI } from './aiAssistant';
import { sendWhatsAppMessage } from './whatsapp';

const webhookRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Rota de teste para verificação via navegador (GET)
 */
webhookRoutes.get('/evolution', (c) => {
  return c.text('Opa! O webhook do Zé está online e esperando mensagens via POST da Evolution API. 🌿');
});

/**
 * Webhook para Evolution API
 * Recebe mensagens do WhatsApp e responde usando IA
 */
webhookRoutes.post('/evolution', async (c) => {
  const body = await c.req.json() as any;
  const env = c.env;
  const db = c.get('db');

  try {
    // 1. Validar se é uma mensagem de texto recebida
    if (body.event !== 'messages.upsert') return c.json({ status: 'ignored' });
    
    const messageData = body.data;
    const isFromMe = messageData.key.fromMe;
    const remoteJid = messageData.key.remoteJid;
    const text = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text;

    // Ignora se for mensagem enviada por nós mesmos ou se não tiver texto
    if (isFromMe || !text || !remoteJid) return c.json({ status: 'ignored' });

    const phone = remoteJid.split('@')[0];
    
    // Verificação de administradores específicos
    const isAdmin = [
      env.ZE_PHONE_1,
      env.ZE_PHONE_2,
      env.SHURA_PHONE
    ].filter(Boolean).includes(phone);

    // 2. Processar com a IA do Seu Zé
    const aiResponse = await processWhatsAppWithAI(db, env, phone, text, isAdmin);

    // 3. Responder via WhatsApp (assíncrono para não travar o webhook)
    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(
        sendWhatsAppMessage(env, phone, aiResponse)
      );
    } else {
      await sendWhatsAppMessage(env, phone, aiResponse);
    }

    return c.json({ status: 'processed' });
  } catch (error) {
    logger.error('Erro no Webhook do WhatsApp', error as Error);
    return c.json({ status: 'error' }, 500);
  }
});

export default webhookRoutes;
