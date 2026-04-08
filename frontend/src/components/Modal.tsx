'use client';

import { useEffect, useId, useRef } from 'react';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '';
  footer?: React.ReactNode;
  description?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = '',
  footer,
  description,
}: ModalProps) {
  const dialogId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef<() => void>(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foca no primeiro elemento apenas uma vez ao abrir
    const focusableElements = getFocusableElements(dialogRef.current);
    focusableElements[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = getFocusableElements(dialogRef.current);
      if (!elements.length) {
        event.preventDefault();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'modal--lg' : size === 'xl' ? 'modal--xl' : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`modal ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div className="modal__header-copy">
            <h3 id={dialogId} className="modal__title">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="modal__description">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

