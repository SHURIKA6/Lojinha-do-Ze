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

  // LOG DE DEPURAÇÃO: Vamos ver o que está chegando
  logger.info('Webhook WhatsApp recebido:', { 
    event: body.event, 
    instance: body.instance,
    hasData: !!body.data 
  });

  try {
    // 1. Validar se é uma mensagem de texto recebida (aceita variações de case)
    const event = (body.event || '').toLowerCase();
    if (event !== 'messages.upsert' && event !== 'messages_upsert') {
      logger.info(`Evento ignorado: ${body.event}`);
      return c.json({ status: 'ignored', reason: 'wrong_event' });
    }
    
    const messageData = body.data;
    if (!messageData) return c.json({ status: 'ignored', reason: 'no_data' });

    const isFromMe = messageData.key?.fromMe;
    const remoteJid = messageData.key?.remoteJid;
    const text = messageData.message?.conversation || 
                 messageData.message?.extendedTextMessage?.text ||
                 messageData.message?.buttonsResponseMessage?.selectedButtonId;

    // Ignora se for mensagem enviada por nós mesmos ou se não tiver texto
    if (isFromMe) return c.json({ status: 'ignored', reason: 'from_me' });
    if (!text) return c.json({ status: 'ignored', reason: 'no_text' });
    if (!remoteJid) return c.json({ status: 'ignored', reason: 'no_remote_jid' });

    // Tenta pegar o telefone do campo 'sender' ou do remoteJid
    const rawPhone = messageData.key?.remoteJid || body.sender || '';
    const phone = rawPhone.split('@')[0].replace(/[^0-9]/g, '');

    // Verificação de administradores específicos
    const adminPhones = [env.ZE_PHONE_1, env.ZE_PHONE_2, env.SHURA_PHONE].filter(Boolean);
    const isAdmin = adminPhones.includes(phone);

    logger.info('Verificação de Admin:', { phone, isAdmin, adminList: adminPhones });

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
