'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiGrid, FiLock, FiShoppingBag, FiUser } from 'react-icons/fi';
import { useAuth } from '@/services/auth/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import CartSidebar from '@/components/loja/CartSidebar';
import CheckoutModal from '@/components/loja/CheckoutModal';
import Header from '@/components/navbar/StorefrontNavbar';
import ProductGrid from '@/components/productGrid/ProductGrid';
import ProductModal from '@/components/loja/ProductModal';
import { useCatalog } from './hooks/useCatalog';
import { useCart } from './hooks/useCart';
import { useCheckout } from './hooks/useCheckout';

export default function StorefrontPageClient({ initialCatalog = null }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [productModal, setProductModal] = useState(null);
  const [productQty, setProductQty] = useState(1);
  const [error, setError] = useState('');

  const router = useRouter();
  const toast = useToast();
  const { user, isAdmin, logout } = useAuth();

  const {
    catalogData,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    filteredProducts,
    allProducts,
    loading,
    error: catalogError,
  } = useCatalog(initialCatalog);

  const {
    cart,
    setCart,
    cartTotal,
    cartCount,
    addToCart,
    updateCartItem,
    removeFromCart,
    getAvailableStock,
  } = useCart(allProducts);

  const {
    customerForm, setCustomerForm,
    customerAddress, setCustomerAddress,
    customerCoords, setCustomerCoords,
    deliveryType, setDeliveryType,
    paymentMethod, setPaymentMethod,
    isRegistered, setIsRegistered,
    editingProfile, setEditingProfile,
    submitting,
    orderResult, setOrderResult,
    handleCheckout,
    sendWhatsAppReceipt
  } = useCheckout({ cart, cartTotal, setError });

  const onCheckoutClick = async () => {
    const success = await handleCheckout();
    if (success) {
      setCart([]);
      setCheckoutOpen(false);
    }
  };

  const handleQuickAdd = (event, product) => {
    event.stopPropagation();
    addToCart(product, 1);
  };

  const openProductModal = (product) => {
    setProductModal(product);
    setProductQty(1);
  };

  const handleAddFromModal = () => {
    if (!productModal) return;
    addToCart(productModal, Math.min(productQty, getAvailableStock(productModal.id)));
    setProductModal(null);
  };

  const portalHref = isAdmin ? '/admin/dashboard' : user ? '/conta' : '/login';
  const portalLabel = isAdmin ? 'Painel Admin' : user ? 'Minha conta' : 'Login';
  const PortalIcon = isAdmin ? FiGrid : user ? FiUser : FiLock;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="loja">
      <Header
        cartCount={cartCount}
        onLogout={user ? handleLogout : undefined}
        onPortalClick={() => router.push(portalHref)}
        portalLabel={portalLabel}
        PortalIcon={PortalIcon}
        search={search}
        setActiveCategory={setActiveCategory}
        setCartOpen={setCartOpen}
        setSearch={setSearch}
      />

      <nav className="loja-categories" aria-label="Categorias do catálogo">
        <div className="loja-categories__inner">
          {catalogData.categories.map((category) => (
            <button
              key={category.name}
              type="button"
              className={`loja-categories__tab ${
                activeCategory === category.name && !search ? 'active' : ''
              }`}
              onClick={() => {
                setActiveCategory(category.name);
                setSearch('');
              }}
            >
              {category.name}
              <span className="loja-categories__count">{category.products.length}</span>
            </button>
          ))}
        </div>
      </nav>

      <ProductGrid
        cart={cart}
        error={error || catalogError}
        filteredProducts={filteredProducts}
        getAvailableStock={getAvailableStock}
        handleQuickAdd={handleQuickAdd}
        loading={loading}
        openProductModal={openProductModal}
        search={search}
      />

      {cartCount > 0 ? (
        <div className="loja-cart-bar">
          <div className="loja-cart-bar__info">
            <span className="loja-cart-bar__total">Total sem entrega</span>
            <span className="loja-cart-bar__amount">
              {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className="loja-cart-bar__items">
              {cartCount} {cartCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <button
            type="button"
            className="loja-cart-bar__btn"
            onClick={() => setCartOpen(true)}
            aria-label={`Abrir carrinho com ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
          >
            <FiShoppingBag />
            Carrinho
          </button>
        </div>
      ) : null}

      <CartSidebar
        cart={cart}
        cartOpen={cartOpen}
        cartTotal={cartTotal}
        getAvailableStock={getAvailableStock}
        removeFromCart={removeFromCart}
        setCartOpen={setCartOpen}
        setCheckoutOpen={setCheckoutOpen}
        updateCartItem={updateCartItem}
      />

      <ProductModal
        getAvailableStock={getAvailableStock}
        handleAddFromModal={handleAddFromModal}
        productModal={productModal}
        productQty={productQty}
        setProductModal={setProductModal}
        setProductQty={setProductQty}
      />

      <CheckoutModal
        cart={cart}
        cartTotal={cartTotal}
        checkoutOpen={checkoutOpen}
        customerAddress={customerAddress}
        customerCoords={customerCoords}
        customerForm={customerForm}
        deliveryType={deliveryType}
        editingProfile={editingProfile}
        error={error}
        handleCheckout={onCheckoutClick}
        isRegistered={isRegistered}
        orderResult={orderResult}
        paymentMethod={paymentMethod}
        setCheckoutOpen={setCheckoutOpen}
        setCustomerAddress={setCustomerAddress}
        setCustomerCoords={setCustomerCoords}
        setCustomerForm={setCustomerForm}
        setDeliveryType={setDeliveryType}
        setEditingProfile={setEditingProfile}
        setOrderResult={setOrderResult}
        setPaymentMethod={setPaymentMethod}
        submitting={submitting}
        onSendWhatsApp={() => sendWhatsAppReceipt(orderResult.order, orderResult.order.items, orderResult._paymentMethod)}
      />
    </div>
  );
}
