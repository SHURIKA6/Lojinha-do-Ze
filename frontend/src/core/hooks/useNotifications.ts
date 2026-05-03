/**
 * Hook: useNotifications
 */

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/core/contexts/AuthContext';

export interface NotificationPayload {
  id: string;
  type: 'order' | 'stock' | 'payment' | 'system';
  title: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

export function useNotifications() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Apenas administradores precisam de notificações em tempo real por enquanto
    if (!isAdmin) return;

    const connect = () => {
      // 1. Prioridade para URL completa definida em variável de ambiente
      if (process.env.NEXT_PUBLIC_WS_URL) {
        console.log('Connecting to notifications websocket (env)...', process.env.NEXT_PUBLIC_WS_URL);
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
        wsRef.current = ws;
        setupListeners(ws);
        return;
      }

      // 2. Fallback: Construção dinâmica baseada na API URL ou localização atual
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = window.location.host;
      let pathPrefix = '/api';

      if (process.env.NEXT_PUBLIC_API_URL) {
        try {
          if (process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
            const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
            host = apiUrl.host;
            // Se a URL da API já termina com /api, não precisamos duplicar
            if (apiUrl.pathname.endsWith('/api') || apiUrl.pathname.endsWith('/api/')) {
              pathPrefix = apiUrl.pathname.replace(/\/$/, '');
            }
          } else if (process.env.NEXT_PUBLIC_API_URL.startsWith('/api')) {
            // Mantemos o prefixo /api se for relativo
            pathPrefix = '/api';
          }
        } catch (e) {
          console.warn('Erro ao processar NEXT_PUBLIC_API_URL, usando fallback:', e);
        }
      }
      
      const wsUrl = `${protocol}//${host}${pathPrefix}/notifications/ws`;

      console.log('Connecting to notifications websocket (dynamic)...', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setupListeners(ws);
    };

    const setupListeners = (ws: WebSocket) => {

      ws.onmessage = (event) => {
        try {
          const payload: NotificationPayload = JSON.parse(event.data);
          setNotifications((prev) => [payload, ...prev].slice(0, 50));
          
          // Mostrar toast para notificações importantes
          if (payload.type === 'order' || payload.type === 'payment') {
            toast.info(payload.message, payload.title);
            
            // Tocar um som sutil se possível
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {}); // Ignora se o browser bloquear auto-play
            } catch (e) {}
          }
        } catch (err) {
          console.error('Error parsing notification:', err);
        }
      };

      ws.onclose = () => {
        console.warn('Notifications websocket closed. Reconnecting...');
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error('Notifications websocket error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAdmin, toast]);

  return { notifications, setNotifications };
}
