/**
 * Modal de Checkout (Finalização de Pedido)
 * 
 * Gerencia endereço de entrega, pagamento
 * e confirmação do pedido.
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  FiGift,
} from 'react-icons/fi';
import styles from './CheckoutModal.module.css';
import { CartItem } from '@/features/storefront/hooks/useCart';

// Importar os novos componentes refatorados
import OrderConfirmation from './checkout-sections/OrderConfirmation';
import CustomerForm from './checkout-sections/CustomerForm';

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
  shippingFee: number;
  calculatingShipping: boolean;
  loyaltyBalance: number;
  pointsToRedeem: number;
  setPointsToRedeem: (points: number) => void;
  usePoints: boolean;
  setUsePoints: (use: boolean) => void;
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
  shippingFee,
  calculatingShipping,
  loyaltyBalance,
  pointsToRedeem,
  setPointsToRedeem,
  usePoints,
  setUsePoints,
}: CheckoutModalProps) {
  const pointsDiscount = usePoints ? pointsToRedeem * 0.05 : 0;
  const checkoutTotal = Math.max(0, cartTotal + shippingFee - pointsDiscount);

  // State for client-side generated QR code (fallback when Mercado Pago doesn't return qr_code_base64)
  const [generatedQrCode, setGeneratedQrCode] = useState<string>('');
  const [qrCodeGenerating, setQrCodeGenerating] = useState<boolean>(false);

  // Generate QR code from qr_code string when qr_code_base64 is not available
  useEffect(() => {
    if (orderResult?.pix?.qr_code && !orderResult.pix.qr_code_base64) {
      setQrCodeGenerating(true);
      import('qrcode').then((QRCode) => {
        QRCode.default.toDataURL(orderResult.pix.qr_code, { 
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        }).then((url: string) => {
          setGeneratedQrCode(url);
          setQrCodeGenerating(false);
        }).catch((err: Error) => {
          console.error('Erro ao gerar QR Code:', err);
          setQrCodeGenerating(false);
        });
      }).catch((err: Error) => {
        console.error('Erro ao carregar biblioteca QR Code:', err);
        setQrCodeGenerating(false);
      });
    }
  }, [orderResult?.pix?.qr_code, orderResult?.pix?.qr_code_base64]);

  // Reset generated QR code when orderResult changes
  useEffect(() => {
    setGeneratedQrCode('');
    setQrCodeGenerating(false);
  }, [orderResult?.id]);

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
        <OrderConfirmation
          orderResult={orderResult}
          pixConfirmed={pixConfirmed}
          setPixConfirmed={setPixConfirmed}
          setOrderResult={setOrderResult}
          onSendWhatsApp={onSendWhatsApp}
        />
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
              <span>Frete</span>
              <span className={calculatingShipping ? styles.loadingText : ''}>
                {calculatingShipping ? 'Calculando...' : formatCurrency(shippingFee)}
              </span>
            </div>
          )}

          {usePoints && pointsDiscount > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.discountLabel}>Desconto (Pontos)</span>
              <span className={styles.discountValue}>- {formatCurrency(pointsDiscount)}</span>
            </div>
          )}

          <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
            <span>Total a pagar</span>
            <span>{formatCurrency(checkoutTotal)}</span>
          </div>
        </div>

        <CustomerForm
          customerForm={customerForm}
          customerAddress={customerAddress}
          customerCoords={customerCoords}
          deliveryType={deliveryType}
          editingProfile={editingProfile}
          isRegistered={isRegistered}
          paymentMethod={paymentMethod}
          loyaltyBalance={loyaltyBalance}
          pointsToRedeem={pointsToRedeem}
          setCustomerForm={setCustomerForm}
          setCustomerAddress={setCustomerAddress}
          setCustomerCoords={setCustomerCoords}
          setDeliveryType={setDeliveryType}
          setEditingProfile={setEditingProfile}
          setPointsToRedeem={setPointsToRedeem}
          setUsePoints={setUsePoints}
          usePoints={usePoints}
          calculatingShipping={calculatingShipping}
          shippingFee={shippingFee}
          setPaymentMethod={setPaymentMethod}
          onSendWhatsApp={onSendWhatsApp}
        />
      </div>
    </Modal>
  );
}