'use client';

import { FiSearch, FiX } from 'react-icons/fi';
import ProductCard from '@/components/productCard/ProductCard';
import styles from './ProductGrid.module.css';
import { Product, StoreCartItem } from '@/types';

interface ProductGridProps {
  cart: StoreCartItem[];
  error: string;
  filteredProducts: Product[];
  getAvailableStock: (id: string | number) => number;
  handleQuickAdd: (event: React.MouseEvent, product: Product) => void;
  loading: boolean;
  openProductModal: (product: Product) => void;
  search: string;
}

export default function ProductGrid({
  cart,
  error,
  filteredProducts,
  getAvailableStock = (_id: string | number) => Number.MAX_SAFE_INTEGER,
  handleQuickAdd,
  loading,
  openProductModal,
  search,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Carregando catálogo...</p>
      </div>
    );
  }

  return (
    <main className={styles.main}>
      {search && (
        <p className={styles.searchInfo}>
          {filteredProducts.length} resultado(s) para "{search}"
        </p>
      )}

      <div className={styles.grid}>
        {(Array.isArray(filteredProducts) ? filteredProducts : []).map((product) => {
          const cartItem = cart.find((item: StoreCartItem) => item.productId === product.id);
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
        <div className={styles.empty}>
          {error ? (
            <>
              <div className={styles.emptyIcon}>
                <FiX />
              </div>
              <p>{error}</p>
            </>
          ) : (
            <>
              <div className={styles.emptyIcon}>
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

