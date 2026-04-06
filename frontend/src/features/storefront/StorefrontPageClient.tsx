'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiGrid, FiLock, FiShoppingBag, FiUser } from 'react-icons/fi';
import { useAuth } from '@/services/auth/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import CartSidebar from '@/components/loja/CartSidebar';
import CheckoutModal from '@/components/loja/CheckoutModal';
import Header from '@/components/navbar/StorefrontNavbar';
import ProductGrid from '@/components/productGrid/ProductGrid';
import ProductModal from '@/components/loja/ProductModal';
import { useCatalog, CategoryTab } from './hooks/useCatalog';
import { useCart } from './hooks/useCart';
import { useCheckout } from './hooks/useCheckout';
import styles from './Storefront.module.css';
import { Product, StoreCartItem, AuthContextType } from '@/types';

export default function StorefrontPageClient({ initialCatalog = null }: { initialCatalog?: any }) {

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [productQty, setProductQty] = useState(1);
  const [error, setError] = useState('');

  const router = useRouter();
  const toast = useToast();
  const { user, isAdmin, logout }: AuthContextType = useAuth();

  const {
    catalogData,
    categoryTabs,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    filteredProducts,
    allProducts,
    loading,
    error: catalogError,
    totalProductsCount,
    hasMore,
    loadMore
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
    pixConfirmed, setPixConfirmed,
    handleCheckout,
    sendWhatsAppReceipt
  } = useCheckout({ cart, cartTotal, setError, user });

  const konamiRef = useRef<string[]>([]);
  const konamiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {

    // Sequência do Konami Code (suportando nomes de teclas modernos e legados)
    const sequence = [
      ['arrowup', 'up'], ['arrowup', 'up'],
      ['arrowdown', 'down'], ['arrowdown', 'down'],
      ['arrowleft', 'left'], ['arrowright', 'right'],
      ['arrowleft', 'left'], ['arrowright', 'right'],
      ['b'], ['a']
    ];

    // Sequência alternativa: 'shura'
    const shuraSeq = ['s', 'h', 'u', 'r', 'a'];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver em campos de texto
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Reseta se demorar muito
      if (konamiTimer.current) clearTimeout(konamiTimer.current);
      konamiTimer.current = setTimeout(() => {
        konamiRef.current = [];
      }, 5000);

      konamiRef.current.push(key);
      konamiRef.current = konamiRef.current.slice(-10);

      // Verifica Konami Code
      const isKonami = sequence.every((keys, i) => {
        const lastIndex = konamiRef.current.length - 10 + i;
        return lastIndex >= 0 && keys.includes(konamiRef.current[lastIndex]);
      });

      // Verifica "shura" (últimas 5 teclas)
      const last5 = konamiRef.current.slice(-5).join('');
      const isShura = last5 === 'shura';

      if ((konamiRef.current.length >= 10 && isKonami) || isShura) {
        toast.info(
          '🌿 "Tudo o que a natureza dá, a gente compartilha. Fica à vontade!" - Seu Zé',
          'SEU ZÉ MODE'
        );
        
        // Redireciona com um pequeno delay
        setTimeout(() => {
          router.push('/shura');
        }, 1500);
        
        konamiRef.current = [];
        if (konamiTimer.current) clearTimeout(konamiTimer.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (konamiTimer.current) clearTimeout(konamiTimer.current);
    };
  }, [toast, router]);

  const onCheckoutClick = async () => {
    const success = await handleCheckout();
    if (success) {
      setCart([]);
      setCheckoutOpen(false);
    }
  };

  const handleQuickAdd = (event: React.MouseEvent, product: Product) => {
    event.stopPropagation();
    addToCart(product, 1);
  };

  const openProductModal = (product: Product) => {
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
    if (typeof logout === 'function') {
      await logout();
    }
  };

  return (
    <div className={styles.wrapper}>
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

      <nav className={styles.categories} aria-label="Categorias do catálogo">
        <div className={styles.categoriesInner}>
          <button
            type="button"
            className={`${styles.categoriesTab} ${!activeCategory && !search ? styles.active : ''}`}
            onClick={() => {
              setActiveCategory('');
              setSearch('');
            }}
          >
            Todos
            <span className={styles.categoriesCount}>{totalProductsCount}</span>
          </button>

          {(categoryTabs?.length > 0 ? categoryTabs : []).map((category: CategoryTab) => (
            <button
              key={category.name}
              type="button"
              className={`${styles.categoriesTab} ${
                activeCategory === category.name && !search ? styles.active : ''
              }`}
              onClick={() => {
                setActiveCategory(category.name);
                setSearch('');
              }}
            >
              {category.name}
              <span className={styles.categoriesCount}>{category.count}</span>
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
        loading={loading && filteredProducts.length === 0}
        openProductModal={openProductModal}
        search={search}
      />

      {hasMore && (
        <div className={styles.loadMore}>
          <button 
            type="button" 
            className={styles.loadMoreBtn}
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Carregar mais produtos'}
          </button>
        </div>
      )}

      {cartCount > 0 ? (
        <div className={styles.cartBar}>
          <div className={styles.cartBarInfo}>
            <span className={styles.cartBarTotal}>Total sem entrega</span>
            <span className={styles.cartBarAmount}>
              {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className={styles.cartBarItems}>
              {cartCount} {cartCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <button
            type="button"
            className={styles.cartBarBtn}
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
        pixConfirmed={pixConfirmed}
        setPixConfirmed={setPixConfirmed}
        onSendWhatsApp={() => {
          const res = orderResult as any;
          if (res?.order) {
            sendWhatsAppReceipt(res.order, res.order.items, res._paymentMethod);
          }
        }}
      />
    </div>
  );
}
