import { useState, useEffect, useCallback } from 'react';
import { Notification as AppNotification } from '@/types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [unreadCount, setUnreadCount] = useState(0);

  // Verifica permissão de notificação
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Carrega notificações do cache
  useEffect(() => {
    loadNotifications();
  }, []);

  // Atualiza contador de não lidas
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
          localStorage.setItem('notifications', JSON.stringify(data.notifications));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const cached = localStorage.getItem('notifications');
      if (cached) {
        const parsed = JSON.parse(cached);
        setNotifications(parsed);
      }
      await fetchNotifications();
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription })
      });
    } catch (error) {
      console.error('Erro ao registrar para push notifications:', error);
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await registerForPushNotifications();
      }
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, []);

  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  }, []);

  const formatTime = (timestamp?: string | number | Date) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return {
    notifications,
    isOpen,
    setIsOpen,
    permission,
    unreadCount,
    requestPermission,
    markAsRead,
    markAllAsRead,
    removeNotification,
    formatTime
  };
}
