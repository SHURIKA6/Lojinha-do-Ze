'use client';

import Modal from '@/components/Modal';
import AppImage from '@/components/ui/AppImage';
import { formatCurrency, getImageUrl } from '@/lib/api';
import { FiMinus, FiPackage, FiPlus } from 'react-icons/fi';
import styles from './ProductModal.module.css';

import { Product } from '@/types';

interface ProductModalProps {
  getAvailableStock: (id: string | number) => number;
  handleAddFromModal: () => void;
  productModal: Product | null;
  productQty: number;
  setProductModal: (p: Product | null) => void;
  setProductQty: (q: number) => void;
}

export default function ProductModal({
  getAvailableStock = (_id: string | number) => Number.MAX_SAFE_INTEGER,
  handleAddFromModal,
  productModal,
  productQty,
  setProductModal,
  setProductQty,
}: ProductModalProps) {
  const availableStock = productModal ? getAvailableStock(productModal.id) : 0;

  return (
    <Modal
      isOpen={!!productModal}
      onClose={() => setProductModal(null)}
      title={productModal?.name || ''}
      size="lg"
    >
      {productModal && (
        <div className={styles.modal}>
          <div className={styles.image}>
            {productModal.photo ? (
              <AppImage
                src={getImageUrl(productModal.photo)}
                alt={productModal.name}
                className={styles.image}
                fill
                sizes="(max-width: 920px) 100vw, 420px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <FiPackage />
            )}
          </div>

          <div className={styles.details}>
            <span className="badge badge--neutral">{productModal.category}</span>
            <h3>{productModal.name}</h3>
            {productModal.description && (
              <p className={styles.description}>{productModal.description}</p>
            )}
            <div className={styles.meta}>
              <span>Código: {productModal.code}</span>
              <span>Estoque: {productModal.quantity} unidades</span>
            </div>
            <div className={styles.price}>{formatCurrency(productModal.sale_price)}</div>
          </div>

          <div className={styles.actions}>
            <div className={styles.qty}>
              <button
                type="button"
                onClick={() => setProductQty(Math.max(1, productQty - 1))}
                aria-label="Diminuir quantidade"
              >
                <FiMinus aria-hidden="true" />
              </button>
              <span aria-live="polite">{productQty}</span>
              <button
                type="button"
                onClick={() => setProductQty(Math.min(availableStock, productQty + 1))}
                disabled={availableStock <= productQty}
                aria-label="Aumentar quantidade"
              >
                <FiPlus aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--full btn--lg"
              onClick={handleAddFromModal}
              disabled={availableStock <= 0}
            >
              Adicionar {formatCurrency(productModal.sale_price * productQty)}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
