'use client';

import Modal from '@/components/Modal';
import AppImage from '@/components/ui/AppImage';
import { formatCurrency, getImageUrl } from '@/lib/api';
import { FiMinus, FiPackage, FiPlus } from 'react-icons/fi';

export default function ProductModal({
  getAvailableStock = () => Number.MAX_SAFE_INTEGER,
  handleAddFromModal,
  productModal,
  productQty,
  setProductModal,
  setProductQty,
}) {
  const availableStock = productModal ? getAvailableStock(productModal.id) : 0;

  return (
    <Modal
      isOpen={!!productModal}
      onClose={() => setProductModal(null)}
      title={productModal?.name || ''}
      size="lg"
    >
      {productModal && (
        <div className="loja-product-modal">
          <div className="loja-product-modal__image">
            {productModal.photo ? (
              <AppImage
                src={getImageUrl(productModal.photo)}
                alt={productModal.name}
                fill
                sizes="(max-width: 920px) 100vw, 420px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <FiPackage />
            )}
          </div>

          <div className="loja-product-modal__details">
            <span className="badge badge--neutral">{productModal.category}</span>
            <h3>{productModal.name}</h3>
            {productModal.description && (
              <p className="loja-product-modal__description">{productModal.description}</p>
            )}
            <div className="loja-product-modal__meta">
              <span>Código: {productModal.code}</span>
              <span>Estoque: {productModal.quantity} unidades</span>
            </div>
            <div className="loja-product-modal__price">{formatCurrency(productModal.sale_price)}</div>
          </div>

          <div className="loja-product-modal__actions">
            <div className="loja-product-modal__qty">
              <button type="button" onClick={() => setProductQty(Math.max(1, productQty - 1))}>
                <FiMinus />
              </button>
              <span>{productQty}</span>
              <button
                type="button"
                onClick={() => setProductQty(Math.min(availableStock, productQty + 1))}
                disabled={availableStock <= productQty}
              >
                <FiPlus />
              </button>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--full btn--lg"
              onClick={handleAddFromModal}
              disabled={availableStock <= 0}
            >
              Adicionar {formatCurrency(parseFloat(productModal.sale_price) * productQty)}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
