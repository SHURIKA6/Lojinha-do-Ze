import { useEffect, useState } from 'react';
import { createOrder, createPixPayment, getPixPaymentStatus } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

const CUSTOMER_STORAGE_KEY = 'lojinha_customer';

export function useCheckout({ cart, cartTotal, setError }) {
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', cpf: '', notes: '' });
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCoords, setCustomerCoords] = useState(null);
  const [deliveryType, setDeliveryType] = useState('entrega');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isRegistered, setIsRegistered] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  
  const toast = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setCustomerForm(prev => ({
        ...prev,
        name: data.name || '',
        phone: data.phone || '',
        cpf: data.cpf || '',
        notes: data.notes || '',
      }));
      setCustomerAddress(data.address || '');
      setCustomerCoords(data.coords || null);
      if (data.name && data.phone) setIsRegistered(true);
    } catch (err) {
      console.error('Erro no armazenamento:', err);
    }
  }, []);

  const sendWhatsAppReceipt = (order, items, method) => {
    const zePhone = process.env.NEXT_PUBLIC_ZE_PHONE;
    console.log('DEBUG: NEXT_PUBLIC_ZE_PHONE =', zePhone);
    if (!zePhone) {
      toast.error('Número de WhatsApp não configurado. Por favor, contate o administrador.');
      return;
    }
    const methodLabel = method === 'pix' ? 'PIX' : 'Maquininha na entrega';
    let message = `🛒 *COMPROVANTE DE PEDIDO - LOJINHA DO ZÉ*\n\n`;
    message += `Olá José! Acabei de finalizar um pedido na loja:\n\n`;
    message += `🔢 *Pedido:* #${order.id}\n`;
    message += `👤 *Cliente:* ${order.customer_name}\n`;
    message += `📱 *Telefone:* ${order.customer_phone}\n`;
    message += `🚚 *Modalidade:* ${order.delivery_type === 'entrega' ? 'Entrega' : 'Retirada no Balcão'}\n`;
    message += `💳 *Pagamento:* ${methodLabel}\n\n`;
    message += '📦 *Itens:*\n';
    items.forEach((item) => {
      message += `  • ${item.quantity}× ${item.name} — R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    if (order.delivery_type === 'entrega') message += '  • Taxa de Entrega — R$ 5,00\n';
    message += `\n💰 *Total Geral: R$ ${parseFloat(order.total).toFixed(2).replace('.', ',')}*\n`;
    if (order.delivery_type === 'entrega' && order.address) message += `\n📍 *Endereço:* ${order.address}\n`;
    if (order.notes) message += `\n📝 *Obs:* ${order.notes}`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${zePhone}?text=${encoded}`, '_blank');
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

    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
      }));

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
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({
          name: customerForm.name,
          phone: customerForm.phone,
          cpf: customerForm.cpf,
          address: customerAddress,
          coords: customerCoords,
          notes: customerForm.notes,
        }));
      }

      setIsRegistered(true);
      setEditingProfile(false);
      setOrderResult({ ...result, _paymentMethod: paymentMethod });
      setPixConfirmed(false); // Reseta para novos pedidos

      if (paymentMethod === 'pix') {
        try {
          // Extrai primeiro e último nome simple
          const nameParts = customerForm.name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Silva';

          const payment = await createPixPayment({
            orderId: result.order.id,
            email: 'cliente@exemplo.com', // Opcional ou pegar se houver
            firstName,
            lastName,
            identificationNumber: customerForm.cpf.replace(/\D/g, '')
          });
          
          setOrderResult(prev => ({ ...prev, pix: payment }));
        } catch (paymentErr) {
          console.error('Erro ao gerar Pix:', paymentErr);
          toast.error('Pedido criado, mas não conseguimos gerar o QR Code Pix. Tente novamente em "Meus Pedidos".');
        }
      } else {
        sendWhatsAppReceipt(result.order, cart, paymentMethod);
      }
      
      toast.success('Pedido enviado com sucesso.');
      return true; // Sucesso
    } catch (err) {
      const msg = err.message || 'Não foi possível finalizar o pedido.';
      setError(msg);
      toast.error(msg, 'Falha no pedido');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Polling para confirmação de pagamento Pix
  useEffect(() => {
    let interval;
    if (orderResult?.pix?.id && !pixConfirmed) {
      interval = setInterval(async () => {
        try {
          const status = await getPixPaymentStatus(orderResult.pix.id);
          if (status.status === 'approved') {
            setPixConfirmed(true);
            clearInterval(interval);
            toast.success('Pagamento Pix confirmado!', 'Sucesso');
            // Envia o WhatsApp automaticamente após confirmação
            sendWhatsAppReceipt(orderResult.order, cart, 'pix');
          }
        } catch (err) {
          console.error('Erro no polling do Pix:', err);
        }
      }, 5000); // 5 segundos
    }
    return () => clearInterval(interval);
  }, [orderResult, pixConfirmed]);

  return {
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
  };
}
