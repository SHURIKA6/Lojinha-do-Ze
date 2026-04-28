import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/core/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';

export interface AppNotification {
  id: string;
  type: 'order' | 'stock' | 'payment' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Apenas conectar se for admin
    if (!user || user.role !== 'admin') {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    // Substituir http por ws 
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/api/notifications/ws';

    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('Notification WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newNotif: AppNotification = {
          id: data.id || Math.random().toString(36).substring(7),
          type: data.type || 'system',
          title: data.title || 'Nova Notificação',
          message: data.message || 'Você tem uma nova notificação',
          createdAt: new Date().toISOString(),
          read: false
        };

        setNotifications(prev => [newNotif, ...prev]);

        // Mostrar um Toast para o admin
        toast({
          title: newNotif.title,
          description: newNotif.message,
          variant: newNotif.type === 'payment' ? 'success' : 'default',
        });
      } catch (err) {
        console.error('Invalid WS message payload', err);
      }
    };

    socket.onclose = () => {
      console.log('Notification WebSocket closed');
    };

    socket.onerror = (err) => {
      console.error('Notification WebSocket error:', err);
    };

    return () => {
      socket.close();
      ws.current = null;
    };
  }, [user, toast]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}
