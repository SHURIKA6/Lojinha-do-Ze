/**
 * Serviço de Notificação Centralizado
 * Gerencia envio de notificações por múltiplos canais
 */

import { logger } from '../../core/utils/logger';
import { cacheService } from './cacheService';

/**
 * Canais de notificação disponíveis
 */
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
  WEBHOOK: 'webhook',
  IN_APP: 'in_app'
} as const;

/**
 * Tipos de notificação
 */
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

export interface NotificationTemplate {
  title: string;
  message: string;
  channels: NotificationChannel[];
}

/**
 * Templates de notificação
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
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP]
  },
  [NOTIFICATION_TYPES.SECURITY_ALERT]: {
    title: 'Alerta de Segurança',
    message: 'Atividade suspeita detectada na sua conta.',
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.PUSH, NOTIFICATION_CHANNELS.IN_APP]
  }
};

export interface NotificationOptions {
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  result?: any;
  error?: string;
}

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
   * Envia notificação para os canais apropriados
   */
  async send(type: NotificationType, data: any, options: NotificationOptions = {}) {
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
      const results = await this.processChannels(notification);
      
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

      return { success: true, notificationId: notification.id, results };
    } catch (error: any) {
      logger.error('Erro ao enviar notificação', error, { type, data });
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa envio para cada canal
   */
  async processChannels(notification: Notification) {
    const results: NotificationResult[] = [];

    for (const channel of notification.channels) {
      try {
        const result = await this.sendToChannel(channel, notification);
        results.push({ channel, success: true, result });
      } catch (error: any) {
        logger.error(`Erro ao enviar notificação via ${channel}`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Envia para canal específico
   */
  async sendToChannel(channel: NotificationChannel, notification: Notification) {
    switch (channel) {
      case NOTIFICATION_CHANNELS.EMAIL:
        return await this.sendEmail(notification);
      case NOTIFICATION_CHANNELS.SMS:
        return await this.sendSMS(notification);
      case NOTIFICATION_CHANNELS.PUSH:
        return await this.sendPush(notification);
      case NOTIFICATION_CHANNELS.WHATSAPP:
        return await this.sendWhatsApp(notification);
      case NOTIFICATION_CHANNELS.WEBHOOK:
        return await this.sendWebhook(notification);
      case NOTIFICATION_CHANNELS.IN_APP:
        return await this.sendInApp(notification);
      default:
        throw new Error(`Canal não suportado: ${channel}`);
    }
  }

  /**
   * Envia email
   */
  async sendEmail(notification: Notification) {
    logger.debug('Email enviado (simulado)', { to: notification.data.email });
    return { success: true, channel: 'email', simulated: true };
  }

  /**
   * Envia SMS
   */
  async sendSMS(notification: Notification) {
    logger.debug('SMS enviado (simulado)', { to: notification.data.phone });
    return { success: true, channel: 'sms', simulated: true };
  }

  /**
   * Envia push notification
   */
  async sendPush(notification: Notification) {
    logger.debug('Push enviado (simulado)', { userId: notification.data.userId });
    return { success: true, channel: 'push', simulated: true };
  }

  /**
   * Envia WhatsApp
   */
  async sendWhatsApp(notification: Notification) {
    const phone = notification.data.phone || (typeof process !== 'undefined' ? process.env.ZE_PHONE : undefined);
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
   * Envia webhook
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
   * Envia notificação in-app
   */
  async sendInApp(notification: Notification) {
    const userId = notification.data.userId;
    if (!userId) {
      throw new Error('UserId não fornecido para notificação in-app');
    }

    const cacheKey = `notifications:${userId}`;
    const existing = (await cacheService.get(cacheKey)) || [];
    
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

    cacheService.set(cacheKey, existing, 86400); // 24 horas
    
    return { success: true, channel: 'in_app', notificationId: notification.id };
  }

  /**
   * Gera ID único para notificação
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Interpola template com dados
   */
  interpolateTemplate(template: string, data: any) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Move notificação para histórico
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
   * Marca notificação como lida
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
   * Obtém notificações não lidas do usuário
   */
  async getUnreadNotifications(userId: number) {
    const cacheKey = `notifications:${userId}`;
    const notifications: InAppNotification[] = (await cacheService.get(cacheKey)) || [];
    return notifications.filter(n => !n.read);
  }

  /**
   * Limpa notificações antigas
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
   * Obtém estatísticas de notificações
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
