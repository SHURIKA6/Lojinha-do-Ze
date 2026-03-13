'use client';

import { FiMinus, FiPlus, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import { formatCurrency } from '@/lib/api';

export default function CartSidebar({
  cartOpen,
  setCartOpen,
  cart,
  cartTotal,
  updateCartItem,
  removeFromCart,
  setCheckoutOpen,
  getAvailableStock = () => Number.MAX_SAFE_INTEGER,
}) {
  if (!cartOpen) return null;

  return (
    <>
      <div className="loja-overlay" onClick={() => setCartOpen(false)} />
      <aside className="loja-cart-sidebar">
        <div className="loja-cart-sidebar__header">
          <h2>Seu Carrinho</h2>
          <button onClick={() => setCartOpen(false)}>
            <FiX />
          </button>
        </div>
        {cart.length > 0 ? (
          <>
            <div className="loja-cart-sidebar__items">
              {cart.map((item) => {
                const availableStock = getAvailableStock(item.productId);
                return (
                <div key={item.productId} className="loja-cart-item">
                  <div className="loja-cart-item__info">
                    <h4>{item.name}</h4>
                    <span className="loja-cart-item__price">
                      {formatCurrency(item.price)} cada
                    </span>
                  </div>
                  <div className="loja-cart-item__controls">
                    <button
                      onClick={() =>
                        updateCartItem(item.productId, item.quantity - 1)
                      }
                    >
                      <FiMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateCartItem(item.productId, item.quantity + 1)
                      }
                      disabled={item.quantity >= availableStock}
                    >
                      <FiPlus />
                    </button>
                  </div>
                  <div className="loja-cart-item__subtotal">
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                    <button
                      className="loja-cart-item__remove"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="loja-cart-sidebar__footer">
              <div className="loja-cart-sidebar__total">
                <span>Total</span>
                <strong>{formatCurrency(cartTotal)}</strong>
              </div>
              <button
                className="btn btn--primary btn--full btn--lg"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                Finalizar Pedido
              </button>
            </div>
          </>
        ) : (
          <div className="loja-cart-sidebar__empty">
            <FiShoppingCart style={{ fontSize: '2.5rem', opacity: 0.3 }} />
            <p>Seu carrinho está vazio</p>
            <button
              className="btn btn--secondary"
              onClick={() => setCartOpen(false)}
            >
              Continuar comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
