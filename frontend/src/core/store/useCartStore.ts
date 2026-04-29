import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem, stock: number) => void;
  updateCartItem: (productId: string, quantity: number, stock: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setCart: (cart: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      
      setCart: (cart) => set({ cart }),

      addToCart: (newItem, stock) =>
        set((state) => {
          const existingIndex = state.cart.findIndex((i) => i.productId === newItem.productId);
          
          if (existingIndex > -1) {
            const nextCart = [...state.cart];
            const nextQty = Math.min(stock, nextCart[existingIndex].quantity + newItem.quantity);
            nextCart[existingIndex] = { ...nextCart[existingIndex], quantity: nextQty };
            return { cart: nextCart };
          }
          
          return {
            cart: [...state.cart, { ...newItem, quantity: Math.min(stock, newItem.quantity) }],
          };
        }),

      updateCartItem: (productId, quantity, stock) =>
        set((state) => {
          if (quantity <= 0) {
            return { cart: state.cart.filter((i) => i.productId !== productId) };
          }
          
          return {
            cart: state.cart.map((i) =>
              i.productId === productId ? { ...i, quantity: Math.min(quantity, stock) } : i
            ),
          };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.productId !== productId),
        })),

      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'lojinha-do-ze-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
