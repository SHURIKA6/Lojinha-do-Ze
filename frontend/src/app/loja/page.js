'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCatalog, createOrder, formatCurrency, getImageUrl } from '@/lib/api';
import Modal from '@/components/Modal';
import dynamic2 from 'next/dynamic';
import { FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiX, FiSearch, FiPhone, FiUser, FiCheckCircle, FiPackage, FiMapPin, FiEdit3, FiTruck, FiShoppingBag } from 'react-icons/fi';

const AddressPicker = dynamic2(() => import('@/components/AddressPicker'), { ssr: false });

export default function LojaPage() {
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

  useEffect(() => {
    getCatalog()
      .then(data => { setCatalogData(data); if (data.categories.length > 0) setActiveCategory(data.categories[0].name); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Load saved customer info (registration)
  useEffect(() => {
    const saved = localStorage.getItem('lojinha_customer');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCustomerForm(prev => ({ ...prev, name: data.name || '', phone: data.phone || '' }));
        setCustomerAddress(data.address || '');
        setCustomerCoords(data.coords || null);
        if (data.name && data.phone) setIsRegistered(true);
      } catch {}
    }
  }, []);

  const allProducts = useMemo(() => catalogData.categories.flatMap(c => c.products), [catalogData]);

  const filteredProducts = useMemo(() => {
    if (search) {
      return allProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    const cat = catalogData.categories.find(c => c.name === activeCategory);
    return cat ? cat.products : allProducts;
  }, [search, activeCategory, allProducts, catalogData]);

  const cartTotal = cart.reduce((s, item) => s + item.price * item.quantity, 0);
  const cartCount = cart.reduce((s, item) => s + item.quantity, 0);

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, { productId: product.id, name: product.name, price: parseFloat(product.sale_price), quantity: qty }];
    });
  };

  const updateCartItem = (productId, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId));
    } else {
      setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity: qty } : item));
    }
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.productId !== productId));

  const handleQuickAdd = (e, product) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const openProductModal = (product) => {
    setProductModal(product);
    setProductQty(1);
  };

  const handleAddFromModal = () => {
    if (productModal) {
      addToCart(productModal, productQty);
      setProductModal(null);
    }
  };

  const sendWhatsAppComprovante = (order, items, method) => {
    const ZE_PHONE = '5511999999999';
    const methodLabel = method === 'pix' ? 'PIX' : 'Maquininha na entrega';
    let msg = `🛒 *NOVO PEDIDO #${order.id}*\n\n`;
    msg += `👤 *Cliente:* ${order.customer_name}\n`;
    msg += `📱 *Telefone:* ${order.customer_phone}\n`;
    msg += `🚚 *Modalidade:* ${deliveryType === 'entrega' ? 'Entrega' : 'Retirada no Balcão'}\n`;
    msg += `💳 *Pagamento:* ${methodLabel}\n\n`;
    msg += `📦 *Itens:*\n`;
    items.forEach(item => {
      msg += `  • ${item.quantity}× ${item.name} — R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    if (deliveryType === 'entrega') {
      msg += `  • Taxa de Entrega — R$ 5.00\n`;
    }
    msg += `\n💰 *Total Geral: R$ ${parseFloat(order.total).toFixed(2)}*\n`;
    if (deliveryType === 'entrega' && customerAddress) msg += `\n📍 *Endereço:* ${customerAddress}\n`;
    if (order.notes) msg += `\n📝 *Obs:* ${order.notes}`;
    const url = `https://wa.me/${ZE_PHONE}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCheckout = async () => {
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      setError('Nome e telefone são obrigatórios');
      return;
    }
    if (deliveryType === 'entrega' && !customerAddress.trim()) {
      setError('Endereço de entrega é obrigatório');
      return;
    }
    setError('');
    setSubmitting(true);

    // Save customer registration for future orders
    localStorage.setItem('lojinha_customer', JSON.stringify({
      name: customerForm.name,
      phone: customerForm.phone,
      address: customerAddress,
      coords: customerCoords,
    }));
    setIsRegistered(true);
    setEditingProfile(false);

    const orderItems = cart.map(item => ({ productId: item.productId, quantity: item.quantity, name: item.name, price: item.price }));

    try {
      const result = await createOrder({
        customer_name: customerForm.name,
        customer_phone: customerForm.phone,
        items: orderItems,
        delivery_type: deliveryType,
        address: customerAddress,
        payment_method: paymentMethod,
        notes: customerForm.notes, // API and WhatsApp will handle payment notes
      });
      setOrderResult({ ...result, _paymentMethod: paymentMethod });
      // Send WhatsApp comprovante to Zé Paulo
      sendWhatsAppComprovante(result.order, cart, paymentMethod);
      setCart([]);
      setCheckoutOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loja-loading">
        <div className="loja-loading__spinner" />
        <p>Carregando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="loja">
      {/* Header */}
      <header className="loja-header">
        <div className="loja-header__inner">
          <div className="loja-header__brand">
            <div className="loja-header__logo">LZ</div>
            <div>
              <h1 className="loja-header__title">Lojinha do Zé</h1>
              <span className="loja-header__subtitle">Produtos Fitoterápicos e Naturais</span>
            </div>
          </div>
          <div className="loja-header__search">
            <FiSearch className="loja-header__search-icon" />
            <input placeholder="Buscar produto..." value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setActiveCategory(''); }} />
            {search && <button className="loja-header__search-clear" onClick={() => setSearch('')}><FiX /></button>}
          </div>
          <button className="loja-header__cart-btn" onClick={() => setCartOpen(true)}>
            <FiShoppingCart />
            {cartCount > 0 && <span className="loja-header__cart-badge">{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="loja-categories">
        <div className="loja-categories__inner">
          {catalogData.categories.map(cat => (
            <button key={cat.name} className={`loja-categories__tab ${activeCategory === cat.name && !search ? 'active' : ''}`}
              onClick={() => { setActiveCategory(cat.name); setSearch(''); }}>
              {cat.name}
              <span className="loja-categories__count">{cat.products.length}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Products Grid */}
      <main className="loja-main">
        {search && (
          <p className="loja-main__search-info">{filteredProducts.length} resultado(s) para "{search}"</p>
        )}
        <div className="loja-grid">
          {filteredProducts.map(product => {
            const cartItem = cart.find(item => item.productId === product.id);
            return (
              <div key={product.id} className="loja-product" onClick={() => openProductModal(product)}>
                <div className="loja-product__image" style={{ overflow: 'hidden' }}>
                  {product.photo ? (
                    <img src={getImageUrl(product.photo)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FiPackage />
                  )}
                </div>
                <div className="loja-product__info">
                  <span className="loja-product__category">{product.category}</span>
                  <h3 className="loja-product__name">{product.name}</h3>
                  <div className="loja-product__footer">
                    <span className="loja-product__price">{formatCurrency(product.sale_price)}</span>
                    <button className={`loja-product__add ${cartItem ? 'in-cart' : ''}`} onClick={(e) => handleQuickAdd(e, product)}>
                      {cartItem ? <span className="loja-product__qty">{cartItem.quantity}</span> : <FiPlus />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredProducts.length === 0 && (
          <div className="loja-empty"><FiSearch style={{ fontSize: '2rem' }} /><p>Nenhum produto encontrado</p></div>
        )}
      </main>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="loja-cart-bar" onClick={() => setCartOpen(true)}>
          <div className="loja-cart-bar__info">
            <span className="loja-cart-bar__total">Total sem entrega</span>
            <span className="loja-cart-bar__amount">{formatCurrency(cartTotal)}</span>
            <span className="loja-cart-bar__items">/ {cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
          </div>
          <button className="loja-cart-bar__btn"><FiShoppingCart /> CARRINHO</button>
        </div>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <>
          <div className="loja-overlay" onClick={() => setCartOpen(false)} />
          <aside className="loja-cart-sidebar">
            <div className="loja-cart-sidebar__header">
              <h2>Seu Carrinho</h2>
              <button onClick={() => setCartOpen(false)}><FiX /></button>
            </div>
            {cart.length > 0 ? (
              <>
                <div className="loja-cart-sidebar__items">
                  {cart.map(item => (
                    <div key={item.productId} className="loja-cart-item">
                      <div className="loja-cart-item__info">
                        <h4>{item.name}</h4>
                        <span className="loja-cart-item__price">{formatCurrency(item.price)} cada</span>
                      </div>
                      <div className="loja-cart-item__controls">
                        <button onClick={() => updateCartItem(item.productId, item.quantity - 1)}><FiMinus /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateCartItem(item.productId, item.quantity + 1)}><FiPlus /></button>
                      </div>
                      <div className="loja-cart-item__subtotal">
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                        <button className="loja-cart-item__remove" onClick={() => removeFromCart(item.productId)}><FiTrash2 /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="loja-cart-sidebar__footer">
                  <div className="loja-cart-sidebar__total">
                    <span>Total</span>
                    <strong>{formatCurrency(cartTotal)}</strong>
                  </div>
                  <button className="btn btn--primary btn--full btn--lg" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                    Finalizar Pedido
                  </button>
                </div>
              </>
            ) : (
              <div className="loja-cart-sidebar__empty">
                <FiShoppingCart style={{ fontSize: '2.5rem', opacity: 0.3 }} />
                <p>Seu carrinho está vazio</p>
                <button className="btn btn--secondary" onClick={() => setCartOpen(false)}>Continuar comprando</button>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Product Detail Modal */}
      <Modal isOpen={!!productModal} onClose={() => setProductModal(null)} title={productModal?.name || ''}>
        {productModal && (
          <div className="loja-product-modal">
            <div className="loja-product-modal__image" style={{ overflow: 'hidden' }}>
              {productModal.photo ? (
                <img src={getImageUrl(productModal.photo)} alt={productModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FiPackage />
              )}
            </div>
            <div className="loja-product-modal__details">
              <span className="badge badge--neutral">{productModal.category}</span>
              <h3 style={{ margin: 'var(--space-3) 0 var(--space-1)' }}>{productModal.name}</h3>
              {productModal.description && (
                <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {productModal.description}
                </p>
              )}
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-4)' }}>Código: {productModal.code}</p>
              <div className="loja-product-modal__price">{formatCurrency(productModal.sale_price)}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-400)', marginBottom: 'var(--space-4)' }}>
                Em estoque: {productModal.quantity} unidades
              </div>
            </div>
            <div className="loja-product-modal__actions">
              <div className="loja-product-modal__qty">
                <button onClick={() => setProductQty(Math.max(1, productQty - 1))}><FiMinus /></button>
                <span>{productQty}</span>
                <button onClick={() => setProductQty(Math.min(productModal.quantity, productQty + 1))}><FiPlus /></button>
              </div>
              <button className="btn btn--primary btn--full btn--lg" onClick={handleAddFromModal}>
                Adicionar {formatCurrency(parseFloat(productModal.sale_price) * productQty)}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Checkout Modal */}
      <Modal isOpen={checkoutOpen} onClose={() => { setCheckoutOpen(false); setEditingProfile(false); }} title="Finalizar Pedido"
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => { setCheckoutOpen(false); setEditingProfile(false); }}>Voltar</button>
            <button className="btn btn--primary btn--lg" onClick={handleCheckout} disabled={submitting}>
              {submitting ? 'Enviando...' : `Confirmar Pedido ${formatCurrency(cartTotal)}`}
            </button>
          </>
        }>
        <div>
          {error && <div className="login-card__error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>Resumo do Pedido</h4>
            {cart.map(item => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-sm)' }}>
                <span>{item.quantity}× {item.name}</span>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            {deliveryType === 'entrega' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginTop: 'var(--space-1)' }}>
                <span>Taxa de Entrega</span>
                <span>{formatCurrency(5)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
              <span>Total a Pagar</span>
              <span style={{ color: 'var(--primary-600)', fontSize: 'var(--font-lg)' }}>
                {formatCurrency(deliveryType === 'entrega' ? cartTotal + 5 : cartTotal)}
              </span>
            </div>
          </div>

          {/* Customer info: saved vs editing */}
          {isRegistered && !editingProfile ? (
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)', border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>Seus Dados</h4>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingProfile(true)}><FiEdit3 /> Editar</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FiUser style={{ color: 'var(--gray-400)', flexShrink: 0 }} /><strong>{customerForm.name}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FiPhone style={{ color: 'var(--gray-400)', flexShrink: 0 }} /><span>{customerForm.phone}</span></div>
                {customerAddress && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}><FiMapPin style={{ color: 'var(--gray-400)', flexShrink: 0, marginTop: 2 }} /><span>{customerAddress}</span></div>}
              </div>
            </div>
          ) : (
            <>
              {isRegistered && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--primary-500)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>✏️ Editando seus dados</div>}
              {!isRegistered && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--primary-500)', fontWeight: 600, marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)' }}>👋 Primeira vez? Preencha seus dados abaixo — só precisa fazer isso uma vez!</div>}
              <div className="form-group">
                <label className="form-label"><FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Nome Completo *</label>
                <input className="form-input" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Seu nome completo" />
              </div>
              <div className="form-group">
                <label className="form-label"><FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Telefone / WhatsApp *</label>
                <input className="form-input" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">🚚 Como deseja receber? *</label>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button type="button" className={`loja-payment-option ${deliveryType === 'entrega' ? 'active' : ''}`} onClick={() => setDeliveryType('entrega')}>
                    <span style={{ fontSize: '1.5rem' }}>🛵</span>
                    <strong>Entrega</strong>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>+ R$ 5,00</span>
                  </button>
                  <button type="button" className={`loja-payment-option ${deliveryType === 'retirada' ? 'active' : ''}`} onClick={() => setDeliveryType('retirada')}>
                    <span style={{ fontSize: '1.5rem' }}>🏪</span>
                    <strong>Retirada</strong>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>Sem taxa</span>
                  </button>
                </div>
              </div>
              {deliveryType === 'entrega' && (
                <AddressPicker address={customerAddress} onAddressChange={setCustomerAddress} coordinates={customerCoords} onCoordinatesChange={setCustomerCoords} />
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">💳 Forma de Pagamento *</label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button type="button" className={`loja-payment-option ${paymentMethod === 'pix' ? 'active' : ''}`} onClick={() => setPaymentMethod('pix')}>
                <span style={{ fontSize: '1.5rem' }}>📱</span>
                <strong>PIX</strong>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>Transferência</span>
              </button>
              <button type="button" className={`loja-payment-option ${paymentMethod === 'maquininha' ? 'active' : ''}`} onClick={() => setPaymentMethod('maquininha')}>
                <span style={{ fontSize: '1.5rem' }}>💳</span>
                <strong>Maquininha</strong>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>Na entrega</span>
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações (opcional)</label>
            <textarea className="form-input" rows={2} value={customerForm.notes} onChange={e => setCustomerForm({...customerForm, notes: e.target.value})} placeholder="Algum detalhe sobre o pedido?" />
          </div>
        </div>
      </Modal>

      {/* Order Confirmation Modal */}
      <Modal isOpen={!!orderResult} onClose={() => setOrderResult(null)} title="Pedido Confirmado! 🎉">
        {orderResult && (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
              <FiCheckCircle style={{ fontSize: '2.5rem', color: 'var(--success-500)' }} />
            </div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Pedido #{orderResult.order.id}</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-6)' }}>Seu pedido foi recebido com sucesso!</p>
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', textAlign: 'left', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>Total</span>
                  <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--primary-600)' }}>{formatCurrency(orderResult.order.total)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>Pagamento</span>
                  <div style={{ fontWeight: 700 }}>{orderResult._paymentMethod === 'pix' ? '📱 PIX' : '💳 Maquininha'}</div>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                ✅ Um comprovante do pedido foi enviado para a loja via WhatsApp.
              </p>
            </div>
            <button className="btn btn--primary btn--full" onClick={() => setOrderResult(null)}>Continuar Comprando</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
