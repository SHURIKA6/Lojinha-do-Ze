import { Bindings } from '../../core/types';

export interface NotificationPayload {
  type: 'order' | 'stock' | 'payment' | 'system';
  title: string;
  message: string;
  [key: string]: any;
}

export async function broadcastNotification(env: Bindings, payload: NotificationPayload): Promise<void> {
  try {
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
