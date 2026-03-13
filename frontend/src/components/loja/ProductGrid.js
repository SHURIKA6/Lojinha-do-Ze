'use client';

import { FiPackage, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { formatCurrency, getImageUrl } from '@/lib/api';

export default function ProductGrid({
  loading,
  error,
  search,
  filteredProducts,
  cart,
  handleQuickAdd,
  openProductModal,
  getAvailableStock = () => Number.MAX_SAFE_INTEGER,
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
          return (
            <div
              key={product.id}
              className="loja-product"
              onClick={() => openProductModal(product)}
            >
              <div className="loja-product__image" style={{ overflow: 'hidden' }}>
                {product.photo ? (
                  <img
                    src={getImageUrl(product.photo)}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <FiPackage />
                )}
              </div>
              <div className="loja-product__info">
                <span className="loja-product__category">{product.category}</span>
                <h3 className="loja-product__name">{product.name}</h3>
                <div className="loja-product__footer">
                  <span className="loja-product__price">
                    {formatCurrency(product.sale_price)}
                  </span>
                  <button
                    className={`loja-product__add ${cartItem ? 'in-cart' : ''}`}
                    onClick={(e) => handleQuickAdd(e, product)}
                    disabled={availableStock <= 0 || cartItem?.quantity >= availableStock}
                  >
                    {cartItem ? (
                      <span className="loja-product__qty">{cartItem.quantity}</span>
                    ) : (
                      <FiPlus />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredProducts.length === 0 && !loading && (
        <div className="loja-empty">
          {error ? (
            <>
              <FiX style={{ fontSize: '2rem', color: 'var(--danger-500)' }} />
              <p style={{ color: 'var(--danger-600)', maxWidth: '300px' }}>
                {error}
              </p>
            </>
          ) : (
            <>
              <FiSearch style={{ fontSize: '2rem' }} />
              <p>Nenhum produto encontrado</p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
