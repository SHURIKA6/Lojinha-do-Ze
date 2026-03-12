'use client';

export default function Modal({ isOpen, onClose, title, children, size = '', footer }) {
  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'modal--lg' : size === 'xl' ? 'modal--xl' : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${sizeClass}`} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">{title}</h3>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {children}
        </div>
        {footer && (
          <div className="modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
