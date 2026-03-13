'use client';

import { FiPackage, FiPlus } from 'react-icons/fi';
import AppImage from '@/components/ui/AppImage';
import { formatCurrency, getImageUrl } from '@/lib/api';

export default function ProductCard({
  product,
  cartItem,
  availableStock,
  onOpen,
  onQuickAdd,
}) {
  const hasStock = availableStock > 0;

  return (
    <article
      className="loja-product"
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
      <div className="loja-product__image">
        <div className="loja-product__stock">
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

      <div className="loja-product__info">
        <span className="loja-product__category">{product.category}</span>
        <h3 className="loja-product__name">{product.name}</h3>
        <p className="loja-product__desc">
          {product.description || 'Produto natural selecionado para uma compra rápida e segura.'}
        </p>

        <div className="loja-product__footer">
          <div>
            <span className="loja-product__price">{formatCurrency(product.sale_price)}</span>
            <div className="loja-product__subinfo">
              {cartItem
                ? `${cartItem.quantity} no carrinho`
                : hasStock
                  ? 'Pronto para adicionar'
                  : 'Indisponível'}
            </div>
          </div>

          <button
            type="button"
            className={`loja-product__add ${cartItem ? 'in-cart' : ''}`}
            onClick={(event) => onQuickAdd(event, product)}
            disabled={!hasStock || cartItem?.quantity >= availableStock}
            aria-label={
              cartItem
                ? `${cartItem.quantity} de ${product.name} no carrinho`
                : `Adicionar ${product.name}`
            }
          >
            {cartItem ? <span className="loja-product__qty">{cartItem.quantity}</span> : <FiPlus />}
          </button>
        </div>
      </div>
    </article>
  );
}

