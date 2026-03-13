'use client';

import Modal from '@/components/Modal';
import {
  FiUser,
  FiPhone,
  FiEdit3,
  FiMapPin,
  FiCheckCircle,
} from 'react-icons/fi';
import { formatCurrency } from '@/lib/api';
import AddressPicker from '@/components/AddressPicker';

export default function CheckoutModal({
  checkoutOpen,
  setCheckoutOpen,
  cart,
  cartTotal,
  handleCheckout,
  submitting,
  error,
  customerForm,
  setCustomerForm,
  deliveryType,
  setDeliveryType,
  customerAddress,
  setCustomerAddress,
  customerCoords,
  setCustomerCoords,
  isRegistered,
  editingProfile,
  setEditingProfile,
  paymentMethod,
  setPaymentMethod,
  orderResult,
  setOrderResult,
}) {
  const checkoutTotal = deliveryType === 'entrega' ? cartTotal + 5 : cartTotal;

  if (orderResult) {
    return (
      <Modal
        isOpen={!!orderResult}
        onClose={() => setOrderResult(null)}
        title="Pedido Confirmado! 🎉"
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--success-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-6)',
            }}
          >
            <FiCheckCircle
              style={{ fontSize: '2.5rem', color: 'var(--success-500)' }}
            />
          </div>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>
            Pedido #{orderResult.order.id}
          </h2>
          <p
            style={{
              color: 'var(--gray-500)',
              marginBottom: 'var(--space-6)',
            }}
          >
            Seu pedido foi recebido com sucesso!
          </p>
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)',
              textAlign: 'left',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 'var(--font-sm)',
                    color: 'var(--gray-500)',
                  }}
                >
                  Total
                </span>
                <div
                  style={{
                    fontSize: 'var(--font-xl)',
                    fontWeight: 800,
                    color: 'var(--primary-600)',
                  }}
                >
                  {formatCurrency(orderResult.order.total)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: 'var(--font-sm)',
                    color: 'var(--gray-500)',
                  }}
                >
                  Pagamento
                </span>
                <div style={{ fontWeight: 700 }}>
                  {orderResult._paymentMethod === 'pix'
                    ? '📱 PIX'
                    : '💳 Maquininha'}
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: 'var(--font-sm)',
                color: 'var(--gray-600)',
              }}
            >
              ✅ Um comprovante do pedido foi enviado para a loja via WhatsApp.
            </p>
          </div>
          <button
            className="btn btn--primary btn--full"
            onClick={() => setOrderResult(null)}
          >
            Continuar Comprando
          </button>
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
      title="Finalizar Pedido"
      footer={
        <>
          <button
            className="btn btn--secondary"
            onClick={() => {
              setCheckoutOpen(false);
              setEditingProfile(false);
            }}
          >
            Voltar
          </button>
          <button
            className="btn btn--primary btn--lg"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting
              ? 'Enviando...'
              : `Confirmar Pedido ${formatCurrency(checkoutTotal)}`}
          </button>
        </>
      }
    >
      <div>
        {error && (
          <div
            className="login-card__error"
            style={{ marginBottom: 'var(--space-4)' }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <h4
            style={{
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-sm)',
              color: 'var(--gray-500)',
            }}
          >
            Resumo do Pedido
          </h4>
          {cart.map((item) => (
            <div
              key={item.productId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
                fontSize: 'var(--font-sm)',
              }}
            >
              <span>
                {item.quantity}× {item.name}
              </span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}
          <div
            style={{
              borderTop: '1px solid var(--gray-200)',
              marginTop: 'var(--space-3)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'var(--font-sm)',
              color: 'var(--gray-600)',
            }}
          >
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
          {deliveryType === 'entrega' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'var(--font-sm)',
                color: 'var(--gray-600)',
                marginTop: 'var(--space-1)',
              }}
            >
              <span>Taxa de Entrega</span>
              <span>{formatCurrency(5)}</span>
            </div>
          )}
          <div
            style={{
              borderTop: '1px solid var(--gray-200)',
              marginTop: 'var(--space-3)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
            }}
          >
            <span>Total a Pagar</span>
            <span
              style={{
                color: 'var(--primary-600)',
                fontSize: 'var(--font-lg)',
              }}
            >
              {formatCurrency(checkoutTotal)}
            </span>
          </div>
        </div>

        {/* Customer info: saved vs editing */}
        {isRegistered && !editingProfile ? (
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
              border: '1px solid var(--gray-200)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <h4
                style={{
                  fontSize: 'var(--font-sm)',
                  color: 'var(--gray-500)',
                }}
              >
                Seus Dados
              </h4>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditingProfile(true)}
              >
                <FiEdit3 /> Editar
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                fontSize: 'var(--font-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <FiUser
                  style={{ color: 'var(--gray-400)', flexShrink: 0 }}
                />
                <strong>{customerForm.name}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <FiPhone
                  style={{ color: 'var(--gray-400)', flexShrink: 0 }}
                />
                <span>{customerForm.phone}</span>
              </div>
              {customerAddress && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                  }}
                >
                  <FiMapPin
                    style={{
                      color: 'var(--gray-400)',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <span>{customerAddress}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {isRegistered && (
              <div
                style={{
                  fontSize: 'var(--font-xs)',
                  color: 'var(--primary-500)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-3)',
                }}
              >
                ✏️ Editando seus dados
              </div>
            )}
            {!isRegistered && (
              <div
                style={{
                  fontSize: 'var(--font-xs)',
                  color: 'var(--primary-500)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--primary-50)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                👋 Primeira vez? Preencha seus dados abaixo — só precisa fazer
                isso uma vez!
              </div>
            )}
            <div className="form-group">
              <label className="form-label">
                <FiUser
                  style={{ marginRight: '0.375rem', verticalAlign: 'middle' }}
                />
                Nome Completo *
              </label>
              <input
                className="form-input"
                value={customerForm.name}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, name: e.target.value })
                }
                placeholder="Seu nome completo"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <FiPhone
                  style={{ marginRight: '0.375rem', verticalAlign: 'middle' }}
                />
                Telefone / WhatsApp *
              </label>
              <input
                className="form-input"
                value={customerForm.phone}
                onChange={(e) =>
                  setCustomerForm({ ...customerForm, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">🚚 Como deseja receber? *</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  className={`loja-payment-option ${
                    deliveryType === 'entrega' ? 'active' : ''
                  }`}
                  onClick={() => setDeliveryType('entrega')}
                >
                  <span style={{ fontSize: '1.5rem' }}>🛵</span>
                  <strong>Entrega</strong>
                  <span
                    style={{
                      fontSize: 'var(--font-xs)',
                      color: 'var(--gray-500)',
                    }}
                  >
                    + R$ 5,00
                  </span>
                </button>
                <button
                  type="button"
                  className={`loja-payment-option ${
                    deliveryType === 'retirada' ? 'active' : ''
                  }`}
                  onClick={() => setDeliveryType('retirada')}
                >
                  <span style={{ fontSize: '1.5rem' }}>🏪</span>
                  <strong>Retirada</strong>
                  <span
                    style={{
                      fontSize: 'var(--font-xs)',
                      color: 'var(--gray-500)',
                    }}
                  >
                    Sem taxa
                  </span>
                </button>
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
          </>
        )}

        <div className="form-group">
          <label className="form-label">💳 Forma de Pagamento *</label>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className={`loja-payment-option ${
                paymentMethod === 'pix' ? 'active' : ''
              }`}
              onClick={() => setPaymentMethod('pix')}
            >
              <span style={{ fontSize: '1.5rem' }}>📱</span>
              <strong>PIX</strong>
              <span
                style={{
                  fontSize: 'var(--font-xs)',
                  color: 'var(--gray-500)',
                }}
              >
                Transferência
              </span>
            </button>
            <button
              type="button"
              className={`loja-payment-option ${
                paymentMethod === 'maquininha' ? 'active' : ''
              }`}
              onClick={() => setPaymentMethod('maquininha')}
            >
              <span style={{ fontSize: '1.5rem' }}>💳</span>
              <strong>Maquininha</strong>
              <span
                style={{
                  fontSize: 'var(--font-xs)',
                  color: 'var(--gray-500)',
                }}
              >
                Na entrega
              </span>
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Observações (opcional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={customerForm.notes}
            onChange={(e) =>
              setCustomerForm({ ...customerForm, notes: e.target.value })
            }
            placeholder="Algum detalhe sobre o pedido?"
          />
        </div>
      </div>
    </Modal>
  );
}
