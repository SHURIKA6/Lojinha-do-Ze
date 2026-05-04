/**
 * Hook: useCart
 */

import { useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Product } from '@/types';
import { useCartStore, CartItem } from '@/core/store/useCartStore';

export type { CartItem };

export function useCart(allProducts: Product[]) {
  const { cart, setCart, addToCart: storeAddToCart, updateCartItem: storeUpdateCartItem, removeFromCart } = useCartStore();
  const toast = useToast();

  const stockByProductId = useMemo(() => {
    const products = Array.isArray(allProducts) ? allProducts : [];
    return Object.fromEntries(products.map((p) => [p.id, Number(p.quantity) || 0]));
  }, [allProducts]);

  useEffect(() => {
    if (Object.keys(stockByProductId).length === 0) return;

    const nextCart = cart
      .map((item) => {
        const stock = stockByProductId[item.productId];
        if (stock !== undefined && item.quantity > stock) {
          return { ...item, quantity: stock };
        }
        return item;
      })
      .filter((item) => (stockByProductId[item.productId] !== undefined ? item.quantity > 0 : true));

    if (JSON.stringify(nextCart) !== JSON.stringify(cart)) {
      setCart(nextCart);
    }
  }, [stockByProductId, cart, setCart]);

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  
  const cartCount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const getAvailableStock = (productId: string) => stockByProductId[productId] ?? 999;

  const addToCart = (product: Product, qty = 1) => {
    const stock = stockByProductId[product.id] ?? product.quantity ?? 0;
    if (stock <= 0) {
      toast.info('Este produto está sem estoque no momento.');
      return;
    }

    const item: CartItem = {
      productId: String(product.id),
      name: product.name,
      price: parseFloat(String(product.sale_price || 0)),
      quantity: qty,
    };

    storeAddToCart(item, stock);
  };

  const updateCartItem = (productId: string, qty: number) => {
    const stock = stockByProductId[productId] ?? 999;
    storeUpdateCartItem(productId, qty, stock);
  };

  return {
    cart,
    setCart,
    cartTotal,
    cartCount,
    addToCart,
    updateCartItem,
    removeFromCart,
    getAvailableStock
  };
}