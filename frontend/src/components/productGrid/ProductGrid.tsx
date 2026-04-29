'use client';

import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import ProductCard from '@/components/productCard/ProductCard';
import { ProductGridSkeleton } from './ProductSkeleton';
import styles from './ProductGrid.module.css';
import { Product } from '@/types';

interface ProductGridProps {
  cart: any[];
  error?: string | null;
  filteredProducts: Product[];
  getAvailableStock?: (productId: string) => number;
  handleQuickAdd: (event: React.MouseEvent | React.KeyboardEvent, product: Product) => void;
  loading: boolean;
  openProductModal: (product: Product) => void;
  search?: string;
}

export default function ProductGrid({
  cart,
  error,
  filteredProducts,
  getAvailableStock = () => Number.MAX_SAFE_INTEGER,
  handleQuickAdd,
  loading,
  openProductModal,
  search,
}: ProductGridProps) {
  if (loading && filteredProducts.length === 0) {
    return <ProductGridSkeleton count={8} />;
  }

  return (
    <main className={styles.main}>
      {search && (
        <p className={styles.searchInfo}>
          {filteredProducts.length} resultado(s) para "{search}"
        </p>
      )}

      <div className={styles.grid}>
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
