'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';
import { formatCurrency } from '@/core/api';
import {
  FiCheckCircle,
  FiCreditCard,
  FiEdit3,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import styles from './CheckoutModal.module.css';
import { CartItem } from '@/features/storefront/hooks/useCart';

const AddressPicker = dynamic(() => import('@/components/AddressPicker'), {
  loading: () => <div className={styles.profileCardNote}>Carregando mapa...</div>,
});

interface ChoiceCardProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}

function ChoiceCard({ active, icon, label, meta, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      className={`${styles.paymentOption} ${active ? styles.active : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={styles.paymentOptionIcon}>{icon}</span>
      <strong>{label}</strong>
      <span>{meta}</span>
    </button>
  );
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  notes: string;
}

interface CheckoutModalProps {
  cart: CartItem[];
  cartTotal: number;
  checkoutOpen: boolean;
  customerAddress: string;
  customerCoords: { lat: number; lng: number } | null;
  customerForm: CustomerFormData;
  deliveryType: string;
  editingProfile: boolean;
  error: string;
  handleCheckout: () => void;
  isRegistered: boolean;
  orderResult: any | null;
  paymentMethod: string;
  setCheckoutOpen: (isOpen: boolean) => void;
  setCustomerAddress: (address: string) => void;
  setCustomerCoords: (coords: { lat: number; lng: number } | null) => void;
  setCustomerForm: (form: CustomerFormData) => void;
  setDeliveryType: (type: string) => void;
  setEditingProfile: (editing: boolean) => void;
  setOrderResult: (result: any | null) => void;
  setPaymentMethod: (method: string) => void;
  submitting: boolean;
  pixConfirmed: boolean;
  setPixConfirmed: (confirmed: boolean) => void;
  onSendWhatsApp: () => void;
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
  pixConfirmed,
  setPixConfirmed,
  onSendWhatsApp,
}: CheckoutModalProps) {
  const checkoutTotal = deliveryType === 'entrega' ? cartTotal + 5 : cartTotal;

  if (orderResult) {
    const isPix = orderResult._paymentMethod === 'pix';

    return (
      <Modal
        isOpen={!!orderResult}
        onClose={() => {
          setOrderResult(null);
          setPixConfirmed(false);
        }}
        title={isPix && !pixConfirmed ? 'Aguardando Pagamento' : 'Pedido confirmado'}
      >
        <div className={styles.confirmation}>
          <div className={styles.confirmationIcon}>
            <FiCheckCircle style={isPix && !pixConfirmed ? { color: 'var(--info-500)' } : {}} />
          </div>
          <h2>Pedido #{orderResult.order.id}</h2>
          
          <div className={styles.confirmationCard}>
            <div className={styles.confirmationMeta}>
              <div>
                <span>Total</span>
                <div className={styles.confirmationAmount}>
                  {formatCurrency(orderResult.order.total)}
                </div>
              </div>

              <div>
                <span>Pagamento</span>
                <div style={{ fontWeight: 800 }}>
                  {isPix ? 'PIX' : 'Maquininha'}
                </div>
              </div>
            </div>

            {isPix && !pixConfirmed ? (
              <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
                  Aponte o celular para o QR Code abaixo ou utilize o botão "Copia e Cola":
                </p>
                
                {orderResult.pix ? (
                  <>
                    <div style={{ 
                      background: 'white', 
                      padding: 'var(--space-4)', 
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-4)',
                      display: 'inline-block',
                      border: '1px solid var(--gray-200)'
                    }}>
                      <img 
                        src={`data:image/jpeg;base64,${orderResult.pix.qr_code_base64}`} 
                        alt="QR Code Pix" 
                        style={{ width: '200px', height: '200px' }}
                      />
                    </div>
                    
                    <button 
                      type="button" 
                      className="btn btn--outline btn--full" 
                      onClick={() => {
                        navigator.clipboard.writeText(orderResult.pix.qr_code);
                        alert('Código Pix Copia e Cola copiado!');
                      }}
                      style={{ marginBottom: 'var(--space-3)' }}
                    >
                      Copiar Código Pix (Copia e Cola)
                    </button>
                    
                    <div className={styles.pollingStatus}>
                      <span className={styles.spinner}></span>
                      Aguardando confirmação automática...
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
                    Gerando seu código Pix...
                  </div>
                )}
              </div>
            ) : (
              <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
                Seu pedido foi realizado com sucesso! Para agilizar seu atendimento, envie o comprovante via WhatsApp.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            {isPix && !pixConfirmed ? (
              <button 
                type="button" 
                className="btn btn--primary btn--full btn--lg" 
                disabled={orderResult?._checkingPayment}
                onClick={async () => {
                  if (!orderResult?.pix?.id) return;
                  setOrderResult((prev: any) => ({ ...prev, _checkingPayment: true }));
                  try {
                    const { getPixPaymentStatus } = await import('@/core/api');
                    const status = await getPixPaymentStatus(orderResult.pix.id, {
                      orderId: orderResult.order.id,
                      phone: orderResult.order.customer_phone,
                    });
                    if (status.status === 'approved') {
                      setPixConfirmed(true);
                    } else {
                      alert('Pagamento ainda não confirmado. Complete o Pix e tente novamente.');
                    }
                  } catch {
                    alert('Erro ao verificar pagamento. Tente novamente.');
                  } finally {
                    setOrderResult((prev: any) => ({ ...prev, _checkingPayment: false }));
                  }
                }}
              >
                {orderResult?._checkingPayment ? 'Verificando...' : 'Já realizei o pagamento'}
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn--primary btn--full btn--lg" 
                onClick={onSendWhatsApp}
                style={{ background: '#25D366', borderColor: '#25D366' }}
              >
                Enviar para o WhatsApp
              </button>
            )}
            <button 
              type="button" 
              className="btn btn--secondary btn--full" 
              onClick={() => {
                setOrderResult(null);
                setPixConfirmed(false);
              }}
            >
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
      <div className={styles.checkout}>
        {error ? (
          <div className="login-card__error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}

        <div className={styles.summary}>
          <h4 className={styles.summaryTitle}>Resumo do pedido</h4>
          {(Array.isArray(cart) ? cart : []).map((item) => (
            <div key={item.productId} className={styles.summaryRow}>
              <span>
                {item.quantity}x {item.name}
              </span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}

          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>

          {deliveryType === 'entrega' && (
            <div className={styles.summaryRow}>
              <span>Taxa de entrega</span>
              <span>{formatCurrency(5)}</span>
            </div>
          )}

          <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
            <span>Total a pagar</span>
            <span>{formatCurrency(checkoutTotal)}</span>
          </div>
        </div>

        {isRegistered && !editingProfile ? (
          <div className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <h4 className={styles.profileCardTitle}>Seus dados</h4>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingProfile(true)}>
                <FiEdit3 />
                Editar
              </button>
            </div>

            <div className={styles.profileCardList}>
              <div className={styles.profileCardItem}>
                <FiUser />
                <strong>{customerForm.name}</strong>
              </div>
              {customerForm.email ? (
                <div className={styles.profileCardItem}>
                  <FiMail />
                  <span>{customerForm.email}</span>
                </div>
              ) : null}
              <div className={styles.profileCardItem}>
                <FiPhone />
                <span>{customerForm.phone}</span>
              </div>
              {customerAddress && (
                <div className={styles.profileCardItem}>
                  <FiMapPin />
                  <span>{customerAddress}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.profileCard}>
            {isRegistered ? (
              <div className={styles.profileCardNote}>Você está editando seus dados salvos.</div>
            ) : (
              <div className={styles.profileCardNote}>
                Primeira compra? Preencha seus dados uma vez e reaproveite nas próximas.
              </div>
            )}

            <div className="form-group">
              <label htmlFor="checkout-name" className="form-label">
                <FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} aria-hidden="true" />
                Nome completo *
              </label>
              <input
                id="checkout-name"
                className="form-input"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Seu nome completo"
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="checkout-phone" className="form-label">
                <FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} aria-hidden="true" />
                Telefone / WhatsApp *
              </label>
              <input
                id="checkout-phone"
                className="form-input"
                type="tel"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                aria-required="true"
              />
              {customerForm.phone && customerForm.phone.replace(/\D/g, '').length < 10 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'block' }}>
                  Digite o DDD e o número (mínimo 10 dígitos)
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="checkout-email" className="form-label">
                <FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} aria-hidden="true" />
                E-mail {paymentMethod === 'pix' ? '*' : ''}
              </label>
              <input
                id="checkout-email"
                className="form-input"
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="voce@email.com"
                aria-required={paymentMethod === 'pix'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="checkout-cpf" className="form-label">
                <FiCreditCard style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} aria-hidden="true" />
                CPF {paymentMethod === 'pix' ? '(obrigatório para Pix) *' : '(opcional)'}
              </label>
              <input
                id="checkout-cpf"
                className="form-input"
                value={customerForm.cpf}
                onChange={(e) => setCustomerForm({ ...customerForm, cpf: e.target.value })}
                placeholder="000.000.000-00"
                aria-required={paymentMethod === 'pix'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Como deseja receber?</label>
              <div className={styles.choiceGrid}>
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

        <div className={styles.profileCard}>
          <div className="form-group">
            <label className="form-label">Forma de pagamento</label>
            <div className={styles.choiceGrid}>
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
            <label htmlFor="checkout-notes" className="form-label">Observações</label>
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
