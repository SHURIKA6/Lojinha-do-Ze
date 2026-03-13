'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiCheckCircle,
  FiGrid,
  FiLock,
  FiMapPin,
  FiShoppingBag,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import CartSidebar from '@/components/loja/CartSidebar';
import CheckoutModal from '@/components/loja/CheckoutModal';
import Header from '@/components/loja/Header';
import ProductGrid from '@/components/loja/ProductGrid';
import ProductModal from '@/components/loja/ProductModal';
import { createOrder, getCatalog } from '@/lib/api';

const CUSTOMER_STORAGE_KEY = 'lojinha_customer';

export default function StorefrontPageClient() {
  const [catalogData, setCatalogData] = useState({ categories: [], total: 0 });
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [productModal, setProductModal] = useState(null);
  const [productQty, setProductQty] = useState(1);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderResult, setOrderResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', notes: '' });
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCoords, setCustomerCoords] = useState(null);
  const [deliveryType, setDeliveryType] = useState('entrega');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isRegistered, setIsRegistered] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);

    getCatalog()
      .then((data) => {
        if (!active) {
          return;
        }

        setCatalogData(data || { categories: [], total: 0 });
        if (data?.categories?.length > 0) {
          setActiveCategory(data.categories[0].name);
        }
      })
      .catch((catalogError) => {
        console.error(catalogError);
        const nextError =
          'Não foi possível carregar o catálogo. Verifique sua conexão ou as configurações do backend.';
        setError(nextError);
        toast.error(nextError, 'Catálogo indisponível');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const data = JSON.parse(saved);
      setCustomerForm((previous) => ({
        ...previous,
        name: data.name || '',
        phone: data.phone || '',
      }));
      setCustomerAddress(data.address || '');
      setCustomerCoords(data.coords || null);
      if (data.name && data.phone) {
        setIsRegistered(true);
      }
    } catch (storageError) {
      console.error(storageError);
    }
  }, []);

  const allProducts = useMemo(
    () => catalogData.categories.flatMap((category) => category.products),
    [catalogData]
  );

  const stockByProductId = useMemo(
    () => Object.fromEntries(allProducts.map((product) => [product.id, Number(product.quantity) || 0])),
    [allProducts]
  );

  const filteredProducts = useMemo(() => {
    if (search) {
      return allProducts.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    const category = catalogData.categories.find((entry) => entry.name === activeCategory);
    return category ? category.products : allProducts;
  }, [activeCategory, allProducts, catalogData, search]);

  useEffect(() => {
    setCart((previous) =>
      previous
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
    const availableStock = getAvailableStock(product.id);

    if (availableStock <= 0) {
      toast.info('Este produto está sem estoque no momento.');
      return;
    }

    setCart((previous) => {
      const existing = previous.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = Math.min(availableStock, existing.quantity + qty);
        return previous.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQty } : item
        );
      }

      return [
        ...previous,
        {
          productId: product.id,
          name: product.name,
          price: parseFloat(product.sale_price),
          quantity: Math.min(availableStock, qty),
        },
      ];
    });
  };

  const updateCartItem = (productId, qty) => {
    const availableStock = getAvailableStock(productId);

    if (qty <= 0 || availableStock <= 0) {
      setCart((previous) => previous.filter((item) => item.productId !== productId));
      return;
    }

    setCart((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(qty, availableStock) }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart((previous) => previous.filter((item) => item.productId !== productId));
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
    if (!productModal) {
      return;
    }

    addToCart(productModal, Math.min(productQty, getAvailableStock(productModal.id)));
    setProductModal(null);
  };

  const sendWhatsAppReceipt = (order, items, method) => {
    const zePhone = process.env.NEXT_PUBLIC_ZE_PHONE;
    if (!zePhone || typeof window === 'undefined') {
      console.error('NEXT_PUBLIC_ZE_PHONE is not defined in environment variables.');
      return;
    }

    const methodLabel = method === 'pix' ? 'PIX' : 'Maquininha na entrega';
    let message = `🛒 *NOVO PEDIDO #${order.id}*\n\n`;
    message += `👤 *Cliente:* ${order.customer_name}\n`;
    message += `📱 *Telefone:* ${order.customer_phone}\n`;
    message += `🚚 *Modalidade:* ${order.delivery_type === 'entrega' ? 'Entrega' : 'Retirada no Balcão'}\n`;
    message += `💳 *Pagamento:* ${methodLabel}\n\n`;
    message += '📦 *Itens:*\n';

    items.forEach((item) => {
      message += `  • ${item.quantity}× ${item.name} — R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });

    if (order.delivery_type === 'entrega') {
      message += '  • Taxa de Entrega — R$ 5.00\n';
    }

    message += `\n💰 *Total Geral: R$ ${parseFloat(order.total).toFixed(2)}*\n`;

    if (order.delivery_type === 'entrega' && order.address) {
      message += `\n📍 *Endereço:* ${order.address}\n`;
    }

    if (order.notes) {
      message += `\n📝 *Obs:* ${order.notes}`;
    }

    window.open(`https://wa.me/${zePhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Adicione ao menos um item ao carrinho.');
      return;
    }

    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      setError('Nome e telefone são obrigatórios.');
      return;
    }

    if (deliveryType === 'entrega' && !customerAddress.trim()) {
      setError('Endereço de entrega é obrigatório.');
      return;
    }

    setError('');
    setSubmitting(true);

    const orderItems = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
    }));

    try {
      const result = await createOrder({
        customer_name: customerForm.name,
        customer_phone: customerForm.phone,
        items: orderItems,
        delivery_type: deliveryType,
        address: customerAddress,
        payment_method: paymentMethod,
        notes: customerForm.notes,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          CUSTOMER_STORAGE_KEY,
          JSON.stringify({
            name: customerForm.name,
            phone: customerForm.phone,
            address: customerAddress,
            coords: customerCoords,
          })
        );
      }

      setIsRegistered(true);
      setEditingProfile(false);
      setOrderResult({ ...result, _paymentMethod: paymentMethod });
      sendWhatsAppReceipt(result.order, cart, paymentMethod);
      setCart([]);
      setCheckoutOpen(false);
      toast.success('Pedido enviado com sucesso.');
    } catch (checkoutError) {
      const nextError = checkoutError.message || 'Não foi possível finalizar o pedido.';
      setError(nextError);
      toast.error(nextError, 'Falha no pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const portalHref = isAdmin ? '/admin/dashboard' : user ? '/cliente' : '/login';
  const portalLabel = isAdmin ? 'Painel' : user ? 'Minha conta' : 'Entrar';
  const PortalIcon = isAdmin ? FiGrid : user ? FiUser : FiLock;
  const categoryCount = catalogData.categories.length;

  return (
    <div className="loja">
      <Header
        cartCount={cartCount}
        onPortalClick={() => router.push(portalHref)}
        portalLabel={portalLabel}
        PortalIcon={PortalIcon}
        search={search}
        setActiveCategory={setActiveCategory}
        setCartOpen={setCartOpen}
        setSearch={setSearch}
      />

      <div className="loja-main">
        <section className="loja-hero">
          <div className="loja-hero__panel">
            <span className="loja-hero__eyebrow">
              <FiCheckCircle />
              Curadoria natural premium
            </span>
            <h1 className="loja-hero__title">Compre com clareza, atendimento local e confiança.</h1>
            <p className="loja-hero__copy">
              Uma vitrine mais profissional para destacar seus produtos naturais, facilitar a decisão
              de compra e manter o pedido fluindo até o WhatsApp da loja.
            </p>

            <div className="loja-hero__chips">
              <span className="loja-hero__chip">
                <FiTruck />
                Entrega local
              </span>
              <span className="loja-hero__chip">
                <FiShoppingBag />
                Retirada no balcão
              </span>
              <span className="loja-hero__chip">
                <FiMapPin />
                PIX ou maquininha
              </span>
            </div>
          </div>

          <div className="loja-hero__card">
            <h2>Experiência mais forte para venda direta</h2>
            <p>Visual editorial para a loja, sem mexer na regra de negócio do seu checkout.</p>

            <div className="loja-hero__stats">
              <div className="loja-hero__stat">
                <span>Categorias</span>
                <strong>{categoryCount}</strong>
              </div>
              <div className="loja-hero__stat">
                <span>Produtos</span>
                <strong>{allProducts.length}</strong>
              </div>
              <div className="loja-hero__stat">
                <span>No carrinho</span>
                <strong>{cartCount}</strong>
              </div>
            </div>

            <div className="loja-hero__meta">
              <div className="loja-hero__meta-item">
                <FiCheckCircle />
                <div>
                  <strong>Checkout simples</strong>
                  <p>Resumo, entrega, pagamento e confirmação no mesmo fluxo.</p>
                </div>
              </div>
              <div className="loja-hero__meta-item">
                <FiGrid />
                <div>
                  <strong>Acesso rápido</strong>
                  <p>Cliente entra na conta e admin acessa o painel direto da vitrine.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

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
        error={error}
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
        handleCheckout={handleCheckout}
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
      />
    </div>
  );
}
