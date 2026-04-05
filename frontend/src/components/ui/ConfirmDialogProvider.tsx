'use client';

import { createContext, useContext, useState } from 'react';
import Modal from '@/components/Modal';

interface ConfirmOptions {
  title?: string;
  description?: string;
  body?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      setDialog({
        ...options,
        resolve,
      });
    });

  const closeDialog = (confirmed: boolean) => {
    if (dialog?.resolve) {
      dialog.resolve(Boolean(confirmed));
    }
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => closeDialog(false)}
        title={dialog?.title || 'Confirmar ação'}
        description={dialog?.description}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => closeDialog(false)}>
              {dialog?.cancelLabel || 'Cancelar'}
            </button>
            <button
              type="button"
              className={`btn ${dialog?.tone === 'primary' ? 'btn--primary' : 'btn--danger'}`}
              onClick={() => closeDialog(true)}
            >
              {dialog?.confirmLabel || 'Confirmar'}
            </button>
          </>
        }
      >
        {dialog?.body ? <p className="modal__confirm-body">{dialog.body}</p> : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm deve ser usado dentro de um ConfirmDialogProvider');
  }

  return context;
}

