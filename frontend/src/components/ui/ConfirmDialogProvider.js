'use client';

import { createContext, useContext, useState } from 'react';
import Modal from '@/components/Modal';

const ConfirmContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = (options) =>
    new Promise((resolve) => {
      setDialog({
        ...options,
        resolve,
      });
    });

  const closeDialog = (confirmed) => {
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

