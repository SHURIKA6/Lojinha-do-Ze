'use client';

import { FiMinus, FiPlus, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import { formatCurrency } from '@/lib/api';
import styles from './CartSidebar.module.css';
import { StoreCartItem } from '@/types';

interface CartSidebarProps {
  cart: StoreCartItem[];
  cartOpen: boolean;
  cartTotal: number;
  getAvailableStock: (id: string | number) => number;
  removeFromCart: (id: string | number) => void;
  setCartOpen: (open: boolean) => void;
  setCheckoutOpen: (open: boolean) => void;
  updateCartItem: (id: string | number, qty: number) => void;
}

export default function CartSidebar({
  cart,
  cartOpen,
  cartTotal,
  getAvailableStock = (_id: string | number) => Number.MAX_SAFE_INTEGER,
  removeFromCart,
  setCartOpen,
  setCheckoutOpen,
  updateCartItem,
}: CartSidebarProps) {
  if (!cartOpen) {
    return null;
  }

  return (
    <>
      <div className={styles.overlay} onClick={() => setCartOpen(false)} />
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <div>
            <h2>Seu carrinho</h2>
            <p>{cart.length} produto(s) selecionado(s)</p>
          </div>
          <button type="button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho">
            <FiX />
          </button>
        </div>

        {cart.length > 0 ? (
          <>
            <div className={styles.items}>
              {(Array.isArray(cart) ? cart : []).map((item) => {
                const availableStock = getAvailableStock(item.productId);

                return (
                  <div key={item.productId} className={styles.item}>
                    <div className={styles.info}>
                      <h4>{item.name}</h4>
                      <span className={styles.price}>{formatCurrency(item.price)} cada</span>
                    </div>

                    <div className={styles.controls}>
                      <button
                        type="button"
                        onClick={() => updateCartItem(item.productId, item.quantity - 1)}
                        aria-label={`Diminuir quantidade de ${item.name}`}
                      >
                        <FiMinus aria-hidden="true" />
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartItem(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= availableStock}
                        aria-label={`Aumentar quantidade de ${item.name}`}
                      >
                        <FiPlus aria-hidden="true" />
                      </button>
                    </div>

                    <div className={styles.subtotal}>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() => removeFromCart(item.productId)}
                        aria-label={`Remover ${item.name} do carrinho`}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.footer}>
              <div className={styles.total}>
                <span>Total</span>
                <strong>{formatCurrency(cartTotal)}</strong>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--full btn--lg"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                Finalizar pedido
              </button>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <FiShoppingCart />
            </div>
            <p>Seu carrinho está vazio.</p>
            <button type="button" className="btn btn--secondary" onClick={() => setCartOpen(false)}>
              Continuar comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
