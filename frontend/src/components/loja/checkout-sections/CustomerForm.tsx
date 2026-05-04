import React from 'react';
import { FiUser, FiPhone, FiMail, FiCreditCard, FiMapPin, FiNavigation, FiEdit3, FiTruck, FiShoppingBag, FiGift, FiCheckCircle } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './CustomerForm.module.css';

const AddressPicker = dynamic(() => import('@/components/AddressPicker'), {
  loading: () => <div className={styles.profileCardNote}>Carregando mapa...</div>,
});

interface CustomerFormProps {
  customerForm: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
    notes: string;
  };
  customerAddress: string;
  customerCoords: { lat: number; lng: number } | null;
  deliveryType: string;
  editingProfile: boolean;
  isRegistered: boolean;
  paymentMethod: string;
  loyaltyBalance: number;
  pointsToRedeem: number;
  setCustomerForm: (form: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
    notes: string;
  }) => void;
  setCustomerAddress: (address: string) => void;
  setCustomerCoords: (coords: { lat: number; lng: number } | null) => void;
  setDeliveryType: (type: string) => void;
  setEditingProfile: (editing: boolean) => void;
  setPointsToRedeem: (points: number) => void;
  setUsePoints: (use: boolean) => void;
  usePoints: boolean;
  calculatingShipping: boolean;
  shippingFee: number;
  setPaymentMethod: (method: string) => void;
  onSendWhatsApp: () => void;
}

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

export default function CustomerForm({
  customerForm,
  customerAddress,
  customerCoords,
  deliveryType,
  editingProfile,
  isRegistered,
  paymentMethod,
  loyaltyBalance,
  pointsToRedeem,
  setCustomerForm,
  setCustomerAddress,
  setCustomerCoords,
  setDeliveryType,
  setEditingProfile,
  setPointsToRedeem,
  setUsePoints,
  usePoints,
  calculatingShipping,
  shippingFee,
  setPaymentMethod,
  onSendWhatsApp,
}: CustomerFormProps) {
  const pointsDiscount = usePoints ? pointsToRedeem * 0.05 : 0;
  const toast = useToast();

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCustomerCoords({ lat, lng });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`
          );
          const data = await response.json();
          if (data.display_name) {
            setCustomerAddress(data.display_name);
          }
        } catch (error) {
          console.error(error);
        }

        setShowMap(true);
      },
      () => {
        toast.error('Não foi possível obter sua localização. Verifique as permissões do navegador.');
      },
      { enableHighAccuracy: true }
    );
  };

  const [showMap, setShowMap] = React.useState(false);

  return (
    <>
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
                meta={calculatingShipping ? '...' : shippingFee > 0 ? `+ ${shippingFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Grátis'}
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

          {/* Fidelidade */}
          {loyaltyBalance > 0 && !isRegistered && (
            <div className={styles.loyaltySection}>
              <div className={styles.loyaltyHeader}>
                <FiGift className={styles.loyaltyIcon} />
                <div>
                  <h4 className={styles.loyaltyTitle}>Você tem {loyaltyBalance} pontos!</h4>
                  <p className={styles.loyaltyText}>Deseja usar seus pontos para ganhar um desconto?</p>
                </div>
              </div>

              <div className={styles.loyaltyAction}>
                <input
                  type="range"
                  min="0"
                  max={loyaltyBalance}
                  step="10"
                  value={pointsToRedeem}
                  onChange={(e) => {
                    setPointsToRedeem(Number(e.target.value));
                    setUsePoints(Number(e.target.value) > 0);
                  }}
                  className={styles.loyaltyRange}
                />
                <div className={styles.loyaltyValues}>
                  <span>0</span>
                  <span>{pointsToRedeem} pts = {(pointsToRedeem * 0.05).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto</span>
                  <span>{loyaltyBalance}</span>
                </div>
              </div>
            </div>
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
    </>
  );
}