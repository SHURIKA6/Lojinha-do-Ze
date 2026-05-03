import { Hono } from 'hono';
import { Bindings, Variables } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { processWhatsAppWithAI } from './aiAssistant';
import { sendWhatsAppMessage } from './whatsapp';

/**
 * Módulo de Rotas de Webhook para Integração com WhatsApp
 * Gerencia webhooks recebidos da Evolution API para mensagens de WhatsApp.
 * Processa mensagens usando assistente AI e envia respostas automáticas.
 */

const webhookRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /evolution
 * Rota de teste para verificação de webhook via navegador.
 * @param {any} c - O contexto do Hono
 * @returns {Response} Texto plano confirmando que o webhook está online
 */
webhookRoutes.get('/evolution', (c) => {
  return c.text('Opa! O webhook do Zé está online e esperando mensagens via POST da Evolution API. 🌿');
});

/**
 * POST /evolution
 * Endpoint de webhook para mensagens WhatsApp da Evolution API.
 * Recebe mensagens do WhatsApp e responde usando assistente AI (Seu Zé).
 * Gerencia verificação de administrador, processamento de mensagens e respostas automáticas.
 * @param {any} c - O contexto do Hono contendo o corpo da requisição e ambiente
 * @returns {Promise<Response>} Resposta JSON indicando o status do processamento
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

    // Verificação de administradores (usamos apenas os dígitos para comparar)
    const phoneDigits = remoteJid.split('@')[0].replace(/[^0-9]/g, '');
    const adminPhones = [env.ZE_PHONE_1, env.ZE_PHONE_2, env.SHURA_PHONE].filter(Boolean);
    const isAdmin = adminPhones.includes(phoneDigits);
 
    logger.info('Verificação de Admin:', { phone: phoneDigits, isAdmin, jid: remoteJid });
 
    // 2. Processar com a IA do Seu Zé (passamos o ID completo para a resposta)
    const aiResponse = await processWhatsAppWithAI(db, env, remoteJid, text, isAdmin);
 
    // 3. Responder via WhatsApp (usando o remoteJid completo)
    if (c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(
        sendWhatsAppMessage(env, remoteJid, aiResponse)
      );
    } else {
      await sendWhatsAppMessage(env, remoteJid, aiResponse);
    }

    return c.json({ status: 'processed' });
  } catch (error) {
    logger.error('Erro no Webhook do WhatsApp', error as Error);
    return c.json({ status: 'error' }, 500);
  }
});

export default webhookRoutes;
