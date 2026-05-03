import { Bindings, Database } from '../../core/types';
import { logger } from '../../core/utils/logger';
import { sendWhatsAppMessage } from '../notifications/whatsapp';

/**
 * Registra logs do sistema no banco de dados e dispara alertas para erros críticos.
 * Persiste logs na tabela system_logs e envia alertas via WhatsApp para erros de nível 'error'.
 * 
 * @param db - Instância do banco de dados para persistência do log
 * @param env - Variáveis de ambiente contendo configurações como ZE_PHONE e ENVIRONMENT
 * @param level - Nível do log ('info', 'warn', 'error')
 * @param message - Mensagem descritiva do log
 * @param context - Dados adicionais de contexto (opcional)
 * @param error - Objeto de erro com stack trace (opcional)
 * @param ctx - Contexto de execução com waitUntil para processamento assíncrono (opcional)
 */
export async function logSystemEvent(
  db: Database,
  env: Bindings,
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: any,
  error?: Error,
  ctx?: any
) {
  const logTask = (async () => {
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
      if (level === 'error' && (env.ZE_PHONE || env.ZE_PHONE_1)) {
        const phone = env.ZE_PHONE || env.ZE_PHONE_1;
        const alertMessage = `⚠️ *ALERTA DE SISTEMA (Lojinha do Zé)*\n\n*Mensagem:* ${message}\n*Erro:* ${error?.message || 'Desconhecido'}\n*Ambiente:* ${env.ENVIRONMENT || 'dev'}\n*Timestamp:* ${new Date().toLocaleString('pt-BR')}`;
        
        await sendWhatsAppMessage(env, phone!, alertMessage).catch(err => {
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
  })();

  if (ctx?.waitUntil) {
    ctx.waitUntil(logTask);
  } else {
    await logTask;
  }
}

/**
 * Recupera logs do sistema do banco de dados com paginação.
 * Retorna logs ordenados por data de criação decrescente.
 * 
 * @param db - Instância do banco de dados para consulta
 * @param limit - Número máximo de registros a retornar (padrão: 100)
 * @param offset - Número de registros para pular (padrão: 0)
 * @returns Array de objetos de log do sistema
 */
export async function getSystemLogs(db: Database, limit = 100, offset = 0) {
  const result = await db.query(
    'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}
