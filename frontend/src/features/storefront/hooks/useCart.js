import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export function useCart(allProducts) {
  const [cart, setCart] = useState([]);
  const toast = useToast();

  const stockByProductId = useMemo(() => {
    const products = Array.isArray(allProducts) ? allProducts : [];
    return Object.fromEntries(products.map((p) => [p.id, Number(p.quantity) || 0]));
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return Array.isArray(allProducts) ? allProducts : [];
  }, [allProducts]);

  useEffect(() => {
    setCart((prev) =>
      prev
        .map((item) => ({
          ...item,
          quantity: Math.min(item.quantity, stockByProductId[item.productId] ?? 0),
        }))
        .filter((item) => item.quantity > 0)
    );
  }, [stockByProductId]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getAvailableStock = (productId) => stockByProductId[productId] ?? 0;

  const addToCart = (product, qty = 1) => {
    const stock = getAvailableStock(product.id);
    if (stock <= 0) {
      toast.info('Este produto está sem estoque no momento.');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = Math.min(stock, existing.quantity + qty);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: parseFloat(product.sale_price),
          quantity: Math.min(stock, qty),
        },
      ];
    });
  };

  const updateCartItem = (productId, qty) => {
    const stock = getAvailableStock(productId);
    if (qty <= 0 || stock <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(qty, stock) }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
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
