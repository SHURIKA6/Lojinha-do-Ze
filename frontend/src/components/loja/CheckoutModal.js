'use client';

import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';
import { formatCurrency } from '@/lib/api';
import {
  FiCheckCircle,
  FiCreditCard,
  FiEdit3,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiTruck,
  FiUser,
} from 'react-icons/fi';

const AddressPicker = dynamic(() => import('@/components/AddressPicker'), {
  loading: () => <div className="loja-profile-card__note">Carregando mapa...</div>,
});

function ChoiceCard({ active, icon, label, meta, onClick }) {
  return (
    <button
      type="button"
      className={`loja-payment-option ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="loja-payment-option__icon">{icon}</span>
      <strong>{label}</strong>
      <span>{meta}</span>
    </button>
  );
}

export default function CheckoutModal({
  cart,
  cartTotal,
  checkoutOpen,
  customerAddress,
  customerCoords,
  customerForm,
  deliveryType,
  editingProfile,
  error,
  handleCheckout,
  isRegistered,
  orderResult,
  paymentMethod,
  setCheckoutOpen,
  setCustomerAddress,
  setCustomerCoords,
  setCustomerForm,
  setDeliveryType,
  setEditingProfile,
  setOrderResult,
  setPaymentMethod,
  submitting,
  onSendWhatsApp,
}) {
  const checkoutTotal = deliveryType === 'entrega' ? cartTotal + 5 : cartTotal;

  if (orderResult) {
    return (
      <Modal
        isOpen={!!orderResult}
        onClose={() => setOrderResult(null)}
        title="Pedido confirmado"
      >
        <div className="loja-confirmation">
          <div className="loja-confirmation__icon">
            <FiCheckCircle />
          </div>
          <h2>Pedido #{orderResult.order.id}</h2>
          <p>Seu pedido foi realizado com sucesso!</p>

          <div className="loja-confirmation__card">
            <div className="loja-confirmation__meta">
              <div>
                <span>Total</span>
                <div className="loja-confirmation__amount">
                  {formatCurrency(orderResult.order.total)}
                </div>
              </div>

              <div>
                <span>Pagamento</span>
                <div style={{ fontWeight: 800 }}>
                  {orderResult._paymentMethod === 'pix' ? 'PIX' : 'Maquininha'}
                </div>
              </div>
            </div>

            <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
              Para agilizar seu atendimento, clique no botão abaixo para enviar o comprovante com os detalhes do seu pedido via WhatsApp.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button 
              type="button" 
              className="btn btn--primary btn--full btn--lg" 
              onClick={onSendWhatsApp}
              style={{ background: '#25D366', borderColor: '#25D366' }}
            >
              Enviar para o WhatsApp
            </button>
            <button type="button" className="btn btn--secondary btn--full" onClick={() => setOrderResult(null)}>
              Voltar para a loja
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={checkoutOpen}
      onClose={() => {
        setCheckoutOpen(false);
        setEditingProfile(false);
      }}
      title="Finalizar pedido"
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setCheckoutOpen(false);
              setEditingProfile(false);
            }}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? 'Enviando...' : `Confirmar ${formatCurrency(checkoutTotal)}`}
          </button>
        </>
      }
    >
      <div className="loja-checkout">
        {error ? (
          <div className="login-card__error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}

        <div className="loja-summary">
          <h4 className="loja-summary__title">Resumo do pedido</h4>
          {cart.map((item) => (
            <div key={item.productId} className="loja-summary__row">
              <span>
                {item.quantity}x {item.name}
              </span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}

          <div className="loja-summary__row">
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>

          {deliveryType === 'entrega' && (
            <div className="loja-summary__row">
              <span>Taxa de entrega</span>
              <span>{formatCurrency(5)}</span>
            </div>
          )}

          <div className="loja-summary__row loja-summary__row--total">
            <span>Total a pagar</span>
            <span>{formatCurrency(checkoutTotal)}</span>
          </div>
        </div>

        {isRegistered && !editingProfile ? (
          <div className="loja-profile-card">
            <div className="loja-profile-card__header">
              <h4 className="loja-profile-card__title">Seus dados</h4>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingProfile(true)}>
                <FiEdit3 />
                Editar
              </button>
            </div>

            <div className="loja-profile-card__list">
              <div className="loja-profile-card__item">
                <FiUser />
                <strong>{customerForm.name}</strong>
              </div>
              <div className="loja-profile-card__item">
                <FiPhone />
                <span>{customerForm.phone}</span>
              </div>
              {customerAddress && (
                <div className="loja-profile-card__item">
                  <FiMapPin />
                  <span>{customerAddress}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="loja-profile-card">
            {isRegistered ? (
              <div className="loja-profile-card__note">Você está editando seus dados salvos.</div>
            ) : (
              <div className="loja-profile-card__note">
                Primeira compra? Preencha seus dados uma vez e reaproveite nas próximas.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Nome completo *
              </label>
              <input
                id="checkout-name"
                className="form-input"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Telefone / WhatsApp *
              </label>
              <input
                id="checkout-phone"
                className="form-input"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Como deseja receber?</label>
              <div className="loja-choice-grid">
                <ChoiceCard
                  active={deliveryType === 'entrega'}
                  icon={<FiTruck />}
                  label="Entrega"
                  meta="+ R$ 5,00"
                  onClick={() => setDeliveryType('entrega')}
                />
                <ChoiceCard
                  active={deliveryType === 'retirada'}
                  icon={<FiShoppingBag />}
                  label="Retirada"
                  meta="Sem taxa"
                  onClick={() => setDeliveryType('retirada')}
                />
              </div>
            </div>

            {deliveryType === 'entrega' && (
              <AddressPicker
                address={customerAddress}
                onAddressChange={setCustomerAddress}
                coordinates={customerCoords}
                onCoordinatesChange={setCustomerCoords}
              />
            )}
          </div>
        )}

        <div className="loja-profile-card">
          <div className="form-group">
            <label className="form-label">Forma de pagamento</label>
            <div className="loja-choice-grid">
              <ChoiceCard
                active={paymentMethod === 'pix'}
                icon={<FiCheckCircle />}
                label="PIX"
                meta="Transferência"
                onClick={() => setPaymentMethod('pix')}
              />
              <ChoiceCard
                active={paymentMethod === 'maquininha'}
                icon={<FiCreditCard />}
                label="Maquininha"
                meta="Na entrega"
                onClick={() => setPaymentMethod('maquininha')}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Observações</label>
            <textarea
              id="checkout-notes"
              className="form-input"
              rows={3}
              value={customerForm.notes}
              onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
              placeholder="Algum detalhe sobre o pedido?"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
