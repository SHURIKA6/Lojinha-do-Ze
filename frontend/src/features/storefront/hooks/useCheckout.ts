import { useEffect, useState } from 'react';
import {
  createOrder,
  createPixPayment,
  getPixPaymentStatus,
  isValidCpf,
  isValidEmail,
} from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { User, StoreCartItem } from '@/types';

const CUSTOMER_STORAGE_KEY = 'lojinha_customer';

interface UseCheckoutProps {
  cart: StoreCartItem[];
  cartTotal: number;
  setError: (msg: string) => void;
  user: User | null;
}

interface Order {
  id: string | number;
  customer_name: string;
  customer_phone: string;
  delivery_type: string;
  total: string | number;
  address?: string;
  notes?: string;
  items?: any[];
}

interface OrderResult {
  order: Order;
  pix?: {
    id: string | number;
    qr_code_base64?: string;
    qr_code?: string;
  };
  _paymentMethod?: string;
}

const formatAddress = (addr: any): string => {
  if (typeof addr === 'string') return addr;
  if (!addr) return '';
  const parts = [
    addr.street,
    addr.number,
    addr.complement,
    addr.neighborhood,
    addr.city,
    addr.state
  ].filter(Boolean);
  return parts.join(', ');
};

export function useCheckout({ cart, cartTotal, setError, user = null }: UseCheckoutProps) {
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    notes: '',
  });
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerCoords, setCustomerCoords] = useState<any>(null);
  const [deliveryType, setDeliveryType] = useState<string>('entrega');
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [isRegistered, setIsRegistered] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  
  const toast = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setCustomerForm((prev) => ({
        ...prev,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
      }));
      // SEC: Não restaurar endereço/coords do localStorage (PII desnecessária)
      if (data.name && data.phone) setIsRegistered(true);
    } catch (err) {
      console.error('Erro no armazenamento:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    setCustomerForm((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email || '',
    }));

    setCustomerAddress((prev) => prev || formatAddress(user.address) || '');
    if (user.name && user.phone && !isRegistered) {
      setIsRegistered(true);
    }
  }, [isRegistered, user]);

  const sendWhatsAppReceipt = (order: Order, items: any[], method: string) => {
    const zePhone = process.env.NEXT_PUBLIC_ZE_PHONE;
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
    items.forEach((item: any) => {
      message += `  • ${item.quantity}× ${item.name} — R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    if (order.delivery_type === 'entrega') message += '  • Taxa de Entrega — R$ 5,00\n';
    message += `\n💰 *Total Geral: R$ ${parseFloat(String(order.total)).toFixed(2).replace('.', ',')}*\n`;
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
    if (customerForm.email && !isValidEmail(customerForm.email)) {
      setError('Informe um e-mail válido para continuar.');
      return;
    }
    if (paymentMethod === 'pix' && !customerForm.email.trim()) {
      setError('Informe um e-mail válido para gerar o pagamento via Pix.');
      return;
    }
    if (paymentMethod === 'pix' && !isValidCpf(customerForm.cpf)) {
      setError('Informe um CPF válido para gerar o pagamento via Pix.');
      return;
    }
    if (deliveryType === 'entrega' && !customerAddress.trim()) {
      setError('Endereço de entrega é obrigatório.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const orderItems = (Array.isArray(cart) ? cart : []).map((item) => ({
        productId: String(item.productId),
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

      // SEC: Não salvar PII desnecessária em localStorage (endereço, coordenadas)
      // Apenas dados mínimos para UX de retorno
      if (typeof window !== 'undefined') {
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({
          name: customerForm.name,
          phone: customerForm.phone,
          email: customerForm.email,
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
            orderId: result.order.id as string,
            email: customerForm.email.trim(),
            phone: customerForm.phone,
            firstName,
            lastName,
            identificationNumber: customerForm.cpf.replace(/\D/g, ''),
          });

          setOrderResult((prev) => prev ? ({ ...prev, pix: payment }) : null);
        } catch (paymentErr: any) {
          console.error('Erro ao gerar Pix:', paymentErr);
          toast.error(
            'Pedido criado, mas não conseguimos gerar o QR Code Pix. Tente novamente em "Meus Pedidos".'
          );
        }
      } else {
        sendWhatsAppReceipt(result.order, result.order.items || orderItems, paymentMethod);
      }

      toast.success('Pedido enviado com sucesso.');
      return true; // Sucesso
    } catch (err: any) {
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
    let interval: any;
    if (orderResult?.pix?.id && !pixConfirmed) {
      interval = setInterval(async () => {
        try {
          const status = await getPixPaymentStatus(orderResult.pix!.id as string, {
            orderId: orderResult.order.id as string,
            phone: orderResult.order.customer_phone,
          });
          if (status.status === 'approved') {
            setPixConfirmed(true);
            clearInterval(interval);
            toast.success('Pagamento Pix confirmado!', 'Sucesso');
            // Envia o WhatsApp automaticamente após confirmação
            sendWhatsAppReceipt(orderResult.order, orderResult.order.items || [], 'pix');
          }
        } catch (err) {
          console.error('Erro no polling do Pix:', err);
        }
      }, 5000); // 5 segundos
    }
    return () => clearInterval(interval);
  }, [orderResult, pixConfirmed, toast]);

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
