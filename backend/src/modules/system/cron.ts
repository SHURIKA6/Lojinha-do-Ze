import { Bindings, Database } from '../../core/types';
import { createDb } from '../../core/db';
import { sendWhatsAppMessage } from '../notifications/whatsapp';
import { logger } from '../../core/utils/logger';
import { getRefreshTokenService } from '../auth/service';
import { deleteExpiredSessions } from '../auth/repository';

export async function handleScheduledTasks(env: Bindings) {
  logger.info('Starting scheduled tasks');
  
  const db = createDb(env.DATABASE_URL);
  
  try {
    await sendPaymentReminders(db, env);
    await cleanupAuthTokens(db, env);
  } catch (error) {
    logger.error('Scheduled tasks failed', error as Error);
  } finally {
    await db.close().catch(() => {});
  }
}

async function sendPaymentReminders(db: Database, env: Bindings) {
  // Find orders pending for more than 2 hours but less than 24 hours
  // We use a specific window to avoid double sending if the cron runs multiple times, 
  // but a better way would be a 'reminder_sent' column.
  // For now, let's use a 1-hour window and assume the cron runs every hour.
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
    logger.info(`Payment reminder sent for order #${order.id}`);
  }
}

async function cleanupAuthTokens(db: Database, env: Bindings) {
  logger.info('Cleaning up expired auth tokens and sessions');
  
  try {
    // 1. Limpa sessões expiradas no banco (short-lived)
    const sessionCount = await deleteExpiredSessions(db);
    if (sessionCount > 0) {
      logger.info(`Cleaned up ${sessionCount} expired sessions`);
    }

    // 2. Limpa refresh tokens expirados (long-lived)
    const refreshService = getRefreshTokenService(db);
    const refreshCount = await refreshService.cleanupExpiredTokens(env);
    
    if (refreshCount > 0) {
      logger.info(`Cleaned up ${refreshCount} expired/revoked refresh tokens`);
    }
  } catch (error) {
    logger.error('Failed to cleanup auth tokens', error as Error);
  }
}
