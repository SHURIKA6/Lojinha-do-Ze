'use client';

import { FiPackage, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import AppImage from '@/components/ui/AppImage';
import { formatCurrency, getImageUrl } from '@/lib/api';

export default function ProductGrid({
  cart,
  error,
  filteredProducts,
  getAvailableStock = () => Number.MAX_SAFE_INTEGER,
  handleQuickAdd,
  loading,
  openProductModal,
  search,
}) {
  if (loading) {
    return (
      <div className="loja-loading">
        <div className="loja-loading__spinner" />
        <p>Carregando catálogo...</p>
      </div>
    );
  }

  return (
    <main className="loja-main">
      {search && (
        <p className="loja-main__search-info">
          {filteredProducts.length} resultado(s) para "{search}"
        </p>
      )}

      <div className="loja-grid">
        {filteredProducts.map((product) => {
          const cartItem = cart.find((item) => item.productId === product.id);
          const availableStock = getAvailableStock(product.id);
          const hasStock = availableStock > 0;

          return (
            <article
              key={product.id}
              className="loja-product"
              role="button"
              tabIndex={0}
              onClick={() => openProductModal(product)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openProductModal(product);
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
                      {cartItem ? `${cartItem.quantity} no carrinho` : hasStock ? 'Pronto para adicionar' : 'Indisponível'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`loja-product__add ${cartItem ? 'in-cart' : ''}`}
                    onClick={(e) => handleQuickAdd(e, product)}
                    disabled={!hasStock || cartItem?.quantity >= availableStock}
                    aria-label={cartItem ? `${cartItem.quantity} de ${product.name} no carrinho` : `Adicionar ${product.name}`}
                  >
                    {cartItem ? <span className="loja-product__qty">{cartItem.quantity}</span> : <FiPlus />}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="loja-empty">
          {error ? (
            <>
              <div className="empty-state__icon">
                <FiX />
              </div>
              <p>{error}</p>
            </>
          ) : (
            <>
              <div className="empty-state__icon">
                <FiSearch />
              </div>
              <p>Nenhum produto encontrado.</p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
