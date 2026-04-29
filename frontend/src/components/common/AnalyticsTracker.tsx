'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/core/api/analytics';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    // Inicializa session ID se não existir
    if (typeof window !== 'undefined') {
      let sessionId = localStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('analytics_session_id', sessionId);
      }
      sessionIdRef.current = sessionId;
    }
  }, []);

  useEffect(() => {
    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    // Evita rastrear o mesmo pageview duas vezes no StrictMode (dev)
    // ou rastreia apenas mudanças de rota
    const handlePageView = () => {
      if (!sessionIdRef.current) return;

      trackEvent({
        eventType: 'page_view',
        sessionId: sessionIdRef.current,
        pageUrl: url,
        metadata: {
          referrer: document.referrer,
          title: document.title,
        }
      });
    };

    // Pequeno delay para garantir que o título da página foi atualizado pelo Next.js
    const timer = setTimeout(handlePageView, 500);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
