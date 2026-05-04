import { Bindings, Database } from '../../core/types';
import { createDb } from '../../core/db';
import { sendWhatsAppMessage } from '../notifications/whatsapp';
import { logger } from '../../core/utils/logger';
import { getRefreshTokenService } from '../auth/service';
import { deleteExpiredSessions } from '../auth/repository';
import * as orderService from '../orders/service';

/**
 * Gerencia a execução de tarefas agendadas para a aplicação.
 * Executa lembretes de pagamento e limpeza de tokens de autenticação.
 * @param env - Bindings do ambiente Cloudflare com URL do banco de dados
 */
export async function handleScheduledTasks(env: Bindings) {
    logger.info('Tarefas agendadas iniciadas');
  
  const db = createDb(env.DATABASE_URL);
  
  try {
    await sendPaymentReminders(db, env);
    await cleanupAuthTokens(db, env);
    await cleanupAbandonedOrders(db, env);
  } catch (error) {
    logger.error('Tarefas agendadas falharam', error as Error);
  } finally {
    await db.close().catch(() => {});
  }
}

/**
 * Envia mensagens de lembrete de pagamento via WhatsApp para pedidos pendentes entre 2-3 horas.
 * Ajuda a recuperar vendas potencialmente perdidas lembrando os clientes.
 * @param db - Instância do banco de dados
 * @param env - Bindings do ambiente Cloudflare
 */
async function sendPaymentReminders(db: Database, env: Bindings) {
  // Busca pedidos pendentes há mais de 2 horas mas menos de 24 horas
  // Usamos uma janela específica para evitar envios duplicados se o cron executar múltiplas vezes,
  // mas uma abordagem melhor seria uma coluna 'reminder_sent'.
  // Por enquanto, usamos uma janela de 1 hora assumindo que o cron roda a cada hora.
  const { rows: pendingOrders } = await db.query(
    `SELECT id, customer_name, customer_phone, total, created_at 
     FROM orders 
     WHERE status = 'pendente' 
     AND created_at < NOW() - INTERVAL '2 hours'
     AND created_at > NOW() - INTERVAL '3 hours'`
  );

  logger.info(`Found ${pendingOrders.length} orders for payment reminder`);

  for (const order of pendingOrders) {
    const msg = `Oi, ${order.customer_name}! Notamos que seu pedido #${order.id} na Lojinha do Zé ainda está aguardando pagamento. Caso tenha alguma dúvida, estamos à disposição!`;
    
    await sendWhatsAppMessage(env, order.customer_phone, msg);
    logger.info(`Lembrete de pagamento enviado para o pedido #${order.id}`);
  }
}

/**
 * Limpa tokens de autenticação e sessões expirados do banco de dados.
 * Remove tanto sessões de curta duração quanto refresh tokens de longa duração.
 * @param db - Instância do banco de dados
 * @param env - Bindings do ambiente Cloudflare
 */
async function cleanupAuthTokens(db: Database, env: Bindings) {
    logger.info('Limpando tokens e sessões de autenticação expirados');
  
  try {
    // 1. Limpa sessões expiradas no banco (short-lived)
    const sessionCount = await deleteExpiredSessions(db);
    if (sessionCount > 0) {
      logger.info(`Limpas ${sessionCount} sessões expiradas`);
    }

    // 2. Limpa refresh tokens expirados (long-lived)
    const refreshService = getRefreshTokenService(db);
    const refreshCount = await refreshService.cleanupExpiredTokens(env);
    
    if (refreshCount > 0) {
      logger.info(`Limpos ${refreshCount} refresh tokens expirados/revogados`);
    }
  } catch (error) {
    logger.error('Falha ao limpar tokens de autenticação', error as Error);
  }
}

/**
 * Cancela automaticamente pedidos pendentes por mais de 24 horas,
 * restaurando o estoque e pontos utilizados.
 * @param db - Instância do banco de dados
 * @param env - Bindings do ambiente Cloudflare
 */
async function cleanupAbandonedOrders(db: Database, env: Bindings) {
  // Busca pedidos pendentes há mais de 24 horas
  const { rows: abandonedOrders } = await db.query(
    `SELECT id FROM orders 
     WHERE status = 'pendente' 
     AND created_at < NOW() - INTERVAL '24 hours'`
  );

  if (abandonedOrders.length === 0) return;

  logger.info(`Limpando ${abandonedOrders.length} pedidos abandonados`);

  for (const order of abandonedOrders) {
    try {
      // Usamos o serviço para garantir que toda a lógica de restauração de estoque/pontos seja executada
      // Passamos '0' ou similar para representar o sistema no histórico
      await orderService.updateOrderStatus(db, order.id, 'cancelado', env, null, undefined, 0);
      logger.info(`Pedido abandonado #${order.id} cancelado pelo sistema`);
    } catch (error) {
      logger.error(`Falha ao cancelar pedido abandonado #${order.id}`, error as Error);
    }
  }
}
