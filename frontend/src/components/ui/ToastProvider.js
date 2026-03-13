'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

function createToast(id, payload) {
  return {
    id,
    type: payload.type || 'info',
    title: payload.title || '',
    message: payload.message || '',
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (payload) => {
    const id = crypto.randomUUID();
    const toast = createToast(id, payload);
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => removeToast(id), payload.duration || 4500);
  };

  const value = useMemo(
    () => ({
      showToast,
      success: (message, title = 'Sucesso') => showToast({ type: 'success', title, message }),
      error: (message, title = 'Erro') => showToast({ type: 'error', title, message }),
      info: (message, title = 'Informação') => showToast({ type: 'info', title, message }),
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
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

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

