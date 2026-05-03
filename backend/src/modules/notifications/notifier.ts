import { Bindings } from '../../core/types';

/**
 * Payload para notificações em tempo real enviadas via Durable Object.
 */
export interface NotificationPayload {
  type: 'order' | 'stock' | 'payment' | 'system';
  title: string;
  message: string;
  [key: string]: any;
}

/**
 * Envia uma notificação em tempo real para todos os clientes conectados via WebSocket.
 * Utiliza o Durable Object NOTIFICATIONS_DO para broadcasting.
 * 
 * @param env - Variáveis de ambiente contendo o binding NOTIFICATIONS_DO.
 * @param payload - Dados da notificação a ser enviada.
 */
export async function broadcastNotification(env: Bindings, payload: NotificationPayload): Promise<void> {
  try {
    if (!env.NOTIFICATIONS_DO || typeof env.NOTIFICATIONS_DO.idFromName !== 'function') {
      console.warn('NOTIFICATIONS_DO binding not found. Skipping real-time notification.');
      return;
    }

    const id = env.NOTIFICATIONS_DO.idFromName('GLOBAL_NOTIFICATIONS');
    const stub = env.NOTIFICATIONS_DO.get(id);

    // Call the Durable Object's fetch handler which we've programmed to intercept POSTs
    await stub.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  } catch (error) {
    console.error('Failed to broadcast notification:', error);
  }
}
