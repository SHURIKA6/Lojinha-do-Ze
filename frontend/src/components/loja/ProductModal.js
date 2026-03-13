'use client';

import Modal from '@/components/Modal';
import { FiMinus, FiPlus, FiPackage } from 'react-icons/fi';
import { formatCurrency, getImageUrl } from '@/lib/api';

export default function ProductModal({
  productModal,
  setProductModal,
  productQty,
  setProductQty,
  handleAddFromModal,
  getAvailableStock = () => Number.MAX_SAFE_INTEGER,
}) {
  const availableStock = productModal ? getAvailableStock(productModal.id) : 0;

  return (
    <Modal
      isOpen={!!productModal}
      onClose={() => setProductModal(null)}
      title={productModal?.name || ''}
    >
      {productModal && (
        <div className="loja-product-modal">
          <div
            className="loja-product-modal__image"
            style={{ overflow: 'hidden' }}
          >
            {productModal.photo ? (
              <img
                src={getImageUrl(productModal.photo)}
                alt={productModal.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <FiPackage />
            )}
          </div>
          <div className="loja-product-modal__details">
            <span className="badge badge--neutral">{productModal.category}</span>
            <h3 style={{ margin: 'var(--space-3) 0 var(--space-1)' }}>
              {productModal.name}
            </h3>
            {productModal.description && (
              <p
                style={{
                  color: 'var(--gray-600)',
                  fontSize: 'var(--font-sm)',
                  marginBottom: 'var(--space-3)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                }}
              >
                {productModal.description}
              </p>
            )}
            <p
              style={{
                color: 'var(--gray-500)',
                fontSize: 'var(--font-sm)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Código: {productModal.code}
            </p>
            <div className="loja-product-modal__price">
              {formatCurrency(productModal.sale_price)}
            </div>
            <div
              style={{
                fontSize: 'var(--font-xs)',
                color: 'var(--gray-400)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Em estoque: {productModal.quantity} unidades
            </div>
          </div>
          <div className="loja-product-modal__actions">
            <div className="loja-product-modal__qty">
              <button
                onClick={() => setProductQty(Math.max(1, productQty - 1))}
              >
                <FiMinus />
              </button>
              <span>{productQty}</span>
              <button
                onClick={() =>
                  setProductQty(
                    Math.min(availableStock, productQty + 1)
                  )
                }
                disabled={availableStock <= productQty}
              >
                <FiPlus />
              </button>
            </div>
            <button
              className="btn btn--primary btn--full btn--lg"
              onClick={handleAddFromModal}
              disabled={availableStock <= 0}
            >
              Adicionar{' '}
              {formatCurrency(
                parseFloat(productModal.sale_price) * productQty
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
