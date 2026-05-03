/**
 * Componente: ToastProvider
 */

'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { ToastContextType, Notification } from '@/types';

const ToastContext = createContext<ToastContextType | null>(null);

function createToast(id: string, payload: Partial<Notification>): Notification {
  return {
    id,
    type: payload.type || 'info',
    title: payload.title || '',
    message: payload.message || '',
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Notification[]>([]);

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (payload: { type?: 'success' | 'error' | 'warning' | 'info'; title?: string; message: string; duration?: number }) => {
    const id = crypto.randomUUID();
    const toast = createToast(id, payload);
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => removeToast(id), payload.duration || 4500);
  };

  const value = useMemo<ToastContextType>(
    () => ({
      showToast,
      success: (message: string, title = 'Sucesso') => showToast({ type: 'success', title, message }),
      error: (message: string, title = 'Erro') => showToast({ type: 'error', title, message }),
      info: (message: string, title = 'Informação') => showToast({ type: 'info', title, message }),
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {(Array.isArray(toasts) ? toasts : []).map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            {toast.title ? <strong className="toast__title">{toast.title}</strong> : null}
            <span className="toast__message">{toast.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Fechar aviso"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Fallback seguro para quando useToast é chamado fora do ToastProvider
// (ex: durante recuperação do ErrorBoundary ou SSR)
const noopToast: ToastContextType = {
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    if (typeof window !== 'undefined') {
      console.warn('[ToastProvider] useToast chamado fora do ToastProvider – usando fallback silencioso.');
    }
    return noopToast;
  }

  return context;
}
