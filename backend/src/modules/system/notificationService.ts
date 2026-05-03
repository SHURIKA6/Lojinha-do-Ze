/**
 * Serviço de Notificação Centralizado
 * Gerencia envio de notificações por múltiplos canais
 */

import { logger } from '../../core/utils/logger';
import { cacheService } from './cacheService';

/** Canais de entrega de notificação disponíveis */
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
  WEBHOOK: 'webhook',
  IN_APP: 'in_app'
} as const;

/** Tipos de notificação pré-configurados organizados por categoria (pedidos, pagamentos, estoque, sistema, usuário) */
export const NOTIFICATION_TYPES = {
  // Pedidos
  ORDER_CREATED: 'order_created',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  
  // Pagamentos
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUNDED: 'payment_refunded',
  
  // Estoque
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  STOCK_REPLENISHED: 'stock_replenished',
  
  // Sistema
  SYSTEM_ALERT: 'system_alert',
  SECURITY_ALERT: 'security_alert',
  PERFORMANCE_ALERT: 'performance_alert',
  
  // Usuário
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_UPDATED: 'account_updated'
} as const;

export type NotificationChannel = typeof NOTIFICATION_CHANNELS[keyof typeof NOTIFICATION_CHANNELS];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/**
 * Template para um tipo de notificação com título, mensagem e canais padrão.
 */
export interface NotificationTemplate {
  title: string;
  message: string;
  channels: NotificationChannel[];
}

/**
 * Templates pré-configurados para cada tipo de notificação.
 * Mapeia tipos de notificação para seus títulos, templates de mensagem e canais de entrega.
 */
export const NOTIFICATION_TEMPLATES: Partial<Record<NotificationType, NotificationTemplate>> = {
  [NOTIFICATION_TYPES.ORDER_CREATED]: {
    title: 'Pedido Criado',
    message: 'Seu pedido #{orderId} foi criado com sucesso!',
    channels: [NOTIFICATION_CHANNELS.WHATSAPP, NOTIFICATION_CHANNELS.IN_APP]
  },
  [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
    title: 'Pedido Confirmado',
    message: 'Seu pedido #{orderId} foi confirmado e está sendo preparado.',
    channels: [NOTIFICATION_CHANNELS.WHATSAPP, NOTIFICATION_CHANNELS.PUSH, NOTIFICATION_CHANNELS.IN_APP]
  },
  [NOTIFICATION_TYPES.ORDER_SHIPPED]: {
    title: 'Pedido Enviado',
    message: 'Seu pedido #{orderId} foi enviado e está a caminho!',
    channels: [NOTIFICATION_CHANNELS.WHATSAPP, NOTIFICATION_CHANNELS.PUSH, NOTIFICATION_CHANNELS.IN_APP]
  },
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
    title: 'Pagamento Recebido',
    message: 'Recebemos o pagamento do pedido #{orderId}. Obrigado!',
    channels: [NOTIFICATION_CHANNELS.WHATSAPP, NOTIFICATION_CHANNELS.IN_APP]
  },
  [NOTIFICATION_TYPES.LOW_STOCK]: {
    title: 'Estoque Baixo',
    message: 'O produto "{productName}" está com estoque baixo ({quantity} unidades).',
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.WHATSAPP]
  },
  [NOTIFICATION_TYPES.SECURITY_ALERT]: {
    title: 'Alerta de Segurança',
    message: 'Atividade suspeita detectada na sua conta.',
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.PUSH, NOTIFICATION_CHANNELS.IN_APP]
  }
};

/**
 * Opções para customizar a entrega de notificações.
 */
export interface NotificationOptions {
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

/**
 * Resultado do envio de uma notificação via um canal específico.
 */
export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Representa uma notificação completa com metadados e status de entrega.
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  channels: NotificationChannel[];
  priority: string;
  scheduledAt: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'partial' | 'failed';
  sentAt?: Date;
  results?: NotificationResult[];
}

/**
 * Notificação in-app exibida na interface do usuário.
 */
export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Classe principal do serviço de notificação
 */
export class NotificationService {
  private pendingNotifications = new Map<string, Notification>();
  private notificationHistory = new Map<string, Notification>();
  private maxHistorySize = 1000;

  constructor() {}

  /**
   * Envia uma notificação usando o template apropriado para o tipo informado.
   * Processa entrega através dos canais configurados (WhatsApp, email, in-app, etc).
   * @param type - O tipo de notificação que determina o template
   * @param data - Dados para interpolação no template (ex: orderId, customerName)
   * @param env - Bindings de ambiente com configurações de canais
   * @param options - Opções opcionais de entrega (canais, prioridade, agendamento)
   * @param ctx - Contexto de execução opcional para operações assíncronas
   * @returns Status de sucesso com ID da notificação e resultados de entrega
   */
  async send(type: NotificationType, data: any, env: any, options: NotificationOptions = {}, ctx?: any) {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      if (!template) {
        logger.warn(`Template de notificação não encontrado: ${type}`);
        return { success: false, error: 'Template não encontrado' };
      }

      const notification: Notification = {
        id: this.generateNotificationId(),
        type,
        title: this.interpolateTemplate(template.title, data),
        message: this.interpolateTemplate(template.message, data),
        data,
        channels: options.channels || template.channels,
        priority: options.priority || 'normal',
        scheduledAt: options.scheduledAt || new Date(),
        createdAt: new Date(),
        status: 'pending'
      };

      this.pendingNotifications.set(notification.id, notification);
      
      const sendTask = (async () => {
        const results = await this.processChannels(notification, env, ctx);
        notification.status = results.every(r => r.success) ? 'sent' : 'partial';
        notification.sentAt = new Date();
        notification.results = results;
        this.moveToHistory(notification);

        logger.info('Notificação enviada', {
          id: notification.id,
          type,
          channels: notification.channels,
          status: notification.status
        });
      })();

      if (ctx?.waitUntil) {
        ctx.waitUntil(sendTask);
        return { success: true, notificationId: notification.id, status: 'processing' };
      } else {
        await sendTask;
        return { success: true, notificationId: notification.id, results: notification.results };
      }
    } catch (error: any) {
      logger.error('Erro ao enviar notificação', error, { type, data });
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa entrega de notificação através de cada canal configurado.
   * @param notification - A notificação a ser processada
   * @param env - Bindings de ambiente
   * @param ctx - Contexto de execução opcional
   * @returns Array de resultados para cada canal
   */
  async processChannels(notification: Notification, env: any, ctx?: any) {
    const results: NotificationResult[] = [];

    for (const channel of notification.channels) {
      try {
        const result = await this.sendToChannel(channel, notification, env, ctx);
        results.push({ channel, success: true, result });
      } catch (error: any) {
        logger.error(`Erro ao enviar notificação via ${channel}`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Roteia notificação para o manipulador de canal apropriado.
   * @param channel - O canal de entrega a ser usado
   * @param notification - A notificação a ser enviada
   * @param env - Bindings de ambiente
   * @param ctx - Contexto de execução opcional
   * @returns Resultado específico do canal
   */
  async sendToChannel(channel: NotificationChannel, notification: Notification, env: any, ctx?: any) {
    switch (channel) {
      case NOTIFICATION_CHANNELS.EMAIL:
        return await this.sendEmail(notification);
      case NOTIFICATION_CHANNELS.SMS:
        return await this.sendSMS(notification);
      case NOTIFICATION_CHANNELS.PUSH:
        return await this.sendPush(notification);
      case NOTIFICATION_CHANNELS.WHATSAPP:
        return await this.sendWhatsApp(notification, env);
      case NOTIFICATION_CHANNELS.WEBHOOK:
        return await this.sendWebhook(notification);
      case NOTIFICATION_CHANNELS.IN_APP:
        return await this.sendInApp(notification, env, ctx);
      default:
        throw new Error(`Canal não suportado: ${channel}`);
    }
  }

  /**
   * Envia notificação via email (atualmente simulado).
   * @param notification - A notificação a ser enviada
   * @returns Resultado de sucesso com informações do canal
   */
  async sendEmail(notification: Notification) {
    logger.debug('Email enviado (simulado)', { to: notification.data.email });
    return { success: true, channel: 'email', simulated: true };
  }

  /**
   * Envia notificação via SMS (atualmente simulado).
   * @param notification - A notificação a ser enviada
   * @returns Resultado de sucesso com informações do canal
   */
  async sendSMS(notification: Notification) {
    logger.debug('SMS enviado (simulado)', { to: notification.data.phone });
    return { success: true, channel: 'sms', simulated: true };
  }

  /**
   * Envia notificação push (atualmente simulado).
   * @param notification - A notificação a ser enviada
   * @returns Resultado de sucesso com informações do canal
   */
  async sendPush(notification: Notification) {
    logger.debug('Push enviado (simulado)', { userId: notification.data.userId });
    return { success: true, channel: 'push', simulated: true };
  }

  /**
   * Envia notificação via WhatsApp usando o número de telefone configurado.
   * @param notification - A notificação a ser enviada
   * @param env - Bindings de ambiente com configuração de telefone
   * @returns Resultado de sucesso com informações do canal
   */
  async sendWhatsApp(notification: Notification, env: any) {
    const phone = notification.data.phone || env?.ZE_PHONE || env?.ZE_PHONE_1;
    if (!phone) {
      throw new Error('Número de telefone não configurado');
    }

    logger.debug('WhatsApp enviado (simulado)', { 
      to: phone, 
      message: notification.message 
    });
    
    return { success: true, channel: 'whatsapp', simulated: true };
  }

  /**
   * Envia notificação via requisição POST para webhook.
   * @param notification - A notificação a ser enviada
   * @returns Resultado de sucesso com código de status HTTP
   * @throws Error se URL do webhook não for fornecida ou a requisição falhar
   */
  async sendWebhook(notification: Notification) {
    const webhookUrl = notification.data.webhookUrl;
    if (!webhookUrl) {
      throw new Error('URL do webhook não fornecida');
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Lojinha-do-Ze-Notifications/1.0'
        },
        body: JSON.stringify({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.createdAt
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      return { success: true, channel: 'webhook', statusCode: response.status };
    } catch (error) {
      logger.error('Erro ao enviar webhook', error, { webhookUrl });
      throw error;
    }
  }

  /**
   * Armazena notificação in-app no cache de notificações do usuário.
   * Mantém as últimas 50 notificações por usuário.
   * @param notification - A notificação a ser armazenada
   * @param env - Bindings de ambiente opcionais
   * @param ctx - Contexto de execução opcional
   * @returns Resultado de sucesso com ID da notificação
   */
  async sendInApp(notification: Notification, env?: any, ctx?: any) {
    const userId = notification.data.userId;
    if (!userId) {
      throw new Error('UserId não fornecido para notificação in-app');
    }

    const cacheKey = `notifications:${userId}`;
    const existing = (await cacheService.get(cacheKey, env?.CACHE_KV, ctx)) || [];
    
    const inAppNotification: InAppNotification = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      createdAt: notification.createdAt
    };

    existing.unshift(inAppNotification);
    
    // Mantém apenas as últimas 50 notificações
    if (existing.length > 50) {
      existing.splice(50);
    }

    await cacheService.set(cacheKey, existing, 86400, env?.CACHE_KV, ctx);
    
    return { success: true, channel: 'in_app', notificationId: notification.id };
  }

  /**
   * Gera um ID único para uma nova notificação.
   * @returns String de ID único da notificação
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Interpola strings de template com valores de dados.
   * Substitui placeholders {chave} com os valores de dados correspondentes.
   * @param template - A string de template com placeholders {chave}
   * @param data - Objeto contendo valores para interpolação
   * @returns String interpolada
   */
  interpolateTemplate(template: string, data: any) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Move uma notificação enviada de pendente para histórico.
   * Impõe tamanho máximo do histórico removendo entradas mais antigas.
   * @param notification - A notificação a ser movida para o histórico
   */
  moveToHistory(notification: Notification) {
    this.notificationHistory.set(notification.id, notification);
    this.pendingNotifications.delete(notification.id);

    // Limita tamanho do histórico
    if (this.notificationHistory.size > this.maxHistorySize) {
      const oldestKey = this.notificationHistory.keys().next().value;
      if (oldestKey) {
        this.notificationHistory.delete(oldestKey);
      }
    }
  }

  /**
   * Marca uma notificação específica como lida para um usuário.
   * Atualiza a lista de notificações em cache.
   * @param userId - O ID do usuário
   * @param notificationId - O ID da notificação a ser marcada como lida
   * @returns True se a notificação foi encontrada e marcada, false caso contrário
   */
  async markAsRead(userId: number, notificationId: string) {
    const cacheKey = `notifications:${userId}`;
    const notifications: InAppNotification[] = (await cacheService.get(cacheKey)) || [];
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await cacheService.set(cacheKey, notifications, 86400);
      return true;
    }
    
    return false;
  }

  /**
   * Recupera todas as notificações não lidas de um usuário.
   * @param userId - O ID do usuário
   * @returns Array de notificações não lidas
   */
  async getUnreadNotifications(userId: number) {
    const cacheKey = `notifications:${userId}`;
    const notifications: InAppNotification[] = (await cacheService.get(cacheKey)) || [];
    return notifications.filter(n => !n.read);
  }

  /**
   * Remove notificações mais antigas que a idade especificada do histórico.
   * @param maxAgeHours - Idade máxima em horas (padrão: 168 = 7 dias)
   */
  cleanupOldNotifications(maxAgeHours = 168) { // 7 dias
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).getTime();
    
    for (const [key, notification] of this.notificationHistory.entries()) {
      if (new Date(notification.createdAt).getTime() < cutoffTime) {
        this.notificationHistory.delete(key);
      }
    }
  }

  /**
   * Retorna estatísticas sobre o serviço de notificações.
   * Inclui contagem pendente, tamanho do histórico e canais/tipos disponíveis.
   * @returns Objeto com estatísticas de notificações
   */
  getStats() {
    return {
      pending: this.pendingNotifications.size,
      history: this.notificationHistory.size,
      channels: Object.values(NOTIFICATION_CHANNELS),
      types: Object.values(NOTIFICATION_TYPES)
    };
  }
}

export const notificationService = new NotificationService();
export default NotificationService;
