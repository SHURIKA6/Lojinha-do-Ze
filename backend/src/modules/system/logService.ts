import { Bindings, Database } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { sendWhatsAppMessage } from '../notifications/whatsapp';

/**
 * Registra logs do sistema no banco de dados e dispara alertas para erros críticos.
 */
export async function logSystemEvent(
  db: Database,
  env: Bindings,
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: any,
  error?: Error
) {
  try {
    // Persistência no banco de dados
    const query = `
      INSERT INTO system_logs (level, message, context, error_stack)
      VALUES ($1, $2, $3, $4)
    `;
    
    await db.query(query, [
      level,
      message,
      context ? JSON.stringify(context) : null,
      error?.stack || null
    ]);

    // Se for um erro crítico, alerta o Zé via WhatsApp (se configurado)
    if (level === 'error' && env.ZE_PHONE) {
      const alertMessage = `⚠️ *ALERTA DE SISTEMA (Lojinha do Zé)*\n\n*Mensagem:* ${message}\n*Erro:* ${error?.message || 'Desconhecido'}\n*Ambiente:* ${env.ENVIRONMENT || 'dev'}\n*Timestamp:* ${new Date().toLocaleString('pt-BR')}`;
      
      // Envio assíncrono para não travar o fluxo principal
      sendWhatsAppMessage(env, env.ZE_PHONE, alertMessage).catch(err => {
         logger.error('Falha ao enviar alerta WhatsApp de erro crítico', err);
      });
    }
  } catch (err) {
    // Fail-safe: se o log no banco falhar, garantimos que apareça no log do console/Cloudflare
    logger.error('Falha catastrófica ao persistir log do sistema no banco', err, {
      originalMessage: message,
      originalLevel: level
    });
  }
}

export async function getSystemLogs(db: Database, limit = 100, offset = 0) {
  const result = await db.query(
    'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}
