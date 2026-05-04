import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import styles from './OrderConfirmation.module.css';

interface OrderConfirmationProps {
  orderResult: any;
  pixConfirmed: boolean;
  setPixConfirmed: (confirmed: boolean) => void;
  setOrderResult: (result: any | null) => void;
  onSendWhatsApp: () => void;
}

export default function OrderConfirmation({
  orderResult,
  pixConfirmed,
  setPixConfirmed,
  setOrderResult,
  onSendWhatsApp,
}: OrderConfirmationProps) {
  const isPix = orderResult._paymentMethod === 'pix';

  return (
    <div className="confirmation">
      <div className="confirmationIcon">
        <FiCheckCircle style={isPix && !pixConfirmed ? { color: 'var(--info-500)' } : {}} />
      </div>
      <h2>Pedido #{orderResult.id}</h2>
      
      <div className="confirmationCard">
        <div className="confirmationMeta">
          <div>
            <span>Total</span>
            <div className="confirmationAmount">
              {orderResult.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                  {orderResult.pix.qr_code_base64 ? (
                    <img 
                      src={`data:image/jpeg;base64,${orderResult.pix.qr_code_base64}`} 
                      alt="QR Code Pix" 
                      style={{ width: '200px', height: '200px' }}
                    />
                  ) : null}
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
                
                <div className="pollingStatus">
                  <span className="spinner"></span>
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
                  orderId: orderResult.id,
                  phone: orderResult.customer_phone,
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
  );
}