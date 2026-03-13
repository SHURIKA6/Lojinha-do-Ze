'use client';

import { FiSearch, FiX } from 'react-icons/fi';
import ProductCard from '@/components/productCard/ProductCard';

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

          return (
            <ProductCard
              key={product.id}
              product={product}
              cartItem={cartItem}
              availableStock={availableStock}
              onOpen={openProductModal}
              onQuickAdd={handleQuickAdd}
            />
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

