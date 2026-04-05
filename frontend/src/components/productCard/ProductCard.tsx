'use client';

import { FiPackage, FiPlus } from 'react-icons/fi';
import AppImage from '@/components/ui/AppImage';
import { formatCurrency, getImageUrl } from '@/lib/api';
import styles from './ProductCard.module.css';

import { Product, StoreCartItem } from '@/types';

interface ProductCardProps {
  product: Product;
  cartItem?: StoreCartItem | null;
  availableStock: number;
  onOpen: (product: Product) => void;
  onQuickAdd: (event: React.MouseEvent, product: Product) => void;
}

export default function ProductCard({
  product,
  cartItem,
  availableStock,
  onOpen,
  onQuickAdd,
}: ProductCardProps) {
  const hasStock = availableStock > 0;

  return (
    <article
      className={styles.product}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(product);
        }
      }}
      aria-label={`Ver detalhes de ${product.name}`}
    >
      <div className={styles.image}>
        <div className={styles.stock}>
          {hasStock ? `${availableStock} un.` : 'Sem estoque'}
        </div>
        {product.photo ? (
          <AppImage
            src={getImageUrl(product.photo)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <FiPackage />
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.category}>{product.category}</span>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.desc}>
          {product.description || 'Produto natural selecionado para uma compra rápida e segura.'}
        </p>

        <div className={styles.footer}>
          <div>
            <span className={styles.price}>{formatCurrency(product.sale_price)}</span>
            <div className={styles.subinfo}>
              {cartItem
                ? `${cartItem.quantity} no carrinho`
                : hasStock
                  ? 'Pronto para adicionar'
                  : 'Indisponível'}
            </div>
          </div>

          <button
            type="button"
            className={`${styles.add} ${cartItem ? styles.inCart : ''}`}
            onClick={(event) => onQuickAdd(event, product)}
            disabled={!hasStock || (cartItem?.quantity ?? 0) >= availableStock}
            aria-label={
              cartItem
                ? `${cartItem.quantity} de ${product.name} no carrinho`
                : `Adicionar ${product.name}`
            }
          >
            {cartItem ? <span className={styles.qty}>{cartItem.quantity}</span> : <FiPlus />}
          </button>
        </div>
      </div>
    </article>
  );
}

