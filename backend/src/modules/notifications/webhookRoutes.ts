import { Hono } from 'hono';
import { Bindings, Variables } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { processWhatsAppWithAI } from './aiAssistant';
import { sendWhatsAppMessage } from './whatsapp';

const webhookRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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
    
    // Lista de administradores via variável de ambiente (separada por vírgula)
    const envAdminPhones = (env.ADMIN_PHONES || '').split(',').map(p => p.trim());
    const zePhone = env.ZE_PHONE ? env.ZE_PHONE.toString() : '';
    
    const isAdmin = envAdminPhones.includes(phone) || phone === zePhone;

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
