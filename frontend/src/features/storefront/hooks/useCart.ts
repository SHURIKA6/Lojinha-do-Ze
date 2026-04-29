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
    return Object.fromEntries(products.map((p) => [p.id, Number(p.quantity || p.stock) || 0]));
  }, [allProducts]);

  // Sincroniza quantidades com o estoque atual (ex: se o estoque diminuiu)
  useEffect(() => {
    if (Object.keys(stockByProductId).length === 0) return;

    const nextCart = cart
      .map((item) => {
        const stock = stockByProductId[item.productId];
        // Se o produto não está na lista atual de produtos, mantemos (pode ser uma busca parcial)
        // Mas se está e a quantidade é maior que o estoque, reduzimos
        if (stock !== undefined && item.quantity > stock) {
          return { ...item, quantity: stock };
        }
        return item;
      })
      .filter((item) => (stockByProductId[item.productId] !== undefined ? item.quantity > 0 : true));

    // Só atualiza se houver mudança real para evitar loops
    if (JSON.stringify(nextCart) !== JSON.stringify(cart)) {
      setCart(nextCart);
    }
  }, [stockByProductId, cart, setCart]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getAvailableStock = (productId: string) => stockByProductId[productId] ?? 999; // Fallback alto se não soubermos o estoque no momento

  const addToCart = (product: Product, qty = 1) => {
    const stock = stockByProductId[product.id] ?? product.quantity ?? product.stock ?? 0;
    if (stock <= 0) {
      toast.info('Este produto está sem estoque no momento.');
      return;
    }

    const item: CartItem = {
      productId: product.id,
      name: product.name,
      price: parseFloat(String(product.sale_price || product.price || 0)),
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
