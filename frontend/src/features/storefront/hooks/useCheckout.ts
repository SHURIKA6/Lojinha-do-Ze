/**
 * Hook: useCheckout
 */

import { useEffect, useState } from 'react';
import {
  createOrder,
  createPixPayment,
  getPixPaymentStatus,
} from '@/core/api';
import { createTransaction, Transaction } from '@/core/api/transactions';
import { getLoyaltyBalance } from '@/core/api/profile';
import { calculateShipping, ShippingOption } from '@/core/api/shipping';
import { formatAddress } from '@/core/utils/formatting';
import { isValidCpf, isValidEmail } from '@/core/api';
import { useToast } from '@/components/ui/ToastProvider';
import { CartItem } from './useCart';
import { User, Order } from '@/types';

const CUSTOMER_STORAGE_KEY = 'lojinha_customer';

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  notes: string;
}

interface UseCheckoutProps {
  cart: CartItem[];
  cartTotal: number;
  setError: (error: string) => void;
  user?: User | null;
}

export function useCheckout({ cart, cartTotal, setError, user = null }: UseCheckoutProps) {
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    notes: '',
  });
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryType, setDeliveryType] = useState<string>('entrega');
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [pixConfirmed, setPixConfirmed] = useState<boolean>(false);
  const [shippingFee, setShippingFee] = useState<number>(5);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [calculatingShipping, setCalculatingShipping] = useState<boolean>(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [usePoints, setUsePoints] = useState<boolean>(false);
  
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

    if (user) {
      getLoyaltyBalance().then(data => {
        setLoyaltyBalance(data.balance);
      }).catch(err => console.error('Erro ao carregar pontos:', err));
    }
  }, [isRegistered, user]);

  useEffect(() => {
    async function updateShipping() {
      if (deliveryType !== 'entrega') {
        setShippingFee(0);
        return;
      }

      if (!customerCoords) {
        setShippingFee(5); // Default se não houver coords
        return;
      }

      setCalculatingShipping(true);
      try {
        const result = await calculateShipping(customerCoords, cartTotal);
        if (result.options.length > 0) {
          // Pega a opção mais barata por padrão ou a primeira
          setShippingOptions(result.options);
          setShippingFee(result.options[0].price);
        }
      } catch (err) {
        console.error('Erro ao calcular frete:', err);
      } finally {
        setCalculatingShipping(false);
      }
    }

    updateShipping();
  }, [customerCoords, deliveryType, cartTotal]);

  const sendWhatsAppReceipt = (order: any, items: any[], method: string) => {
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
    items.forEach((item) => {
      message += `  • ${item.quantity}× ${item.name} — R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    if (order.delivery_type === 'entrega') message += `  • Taxa de Entrega — R$ ${parseFloat(order.delivery_fee || '0').toFixed(2).replace('.', ',')}\n`;
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
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const orderData: Parameters<typeof createOrder>[0] = {
        user_id: user?.id || undefined,
        customer_name: customerForm.name,
        customer_phone: customerForm.phone,
        customer_email: customerForm.email || undefined,
        items: orderItems,
        delivery_type: deliveryType as 'entrega' | 'retirada',
        delivery_fee: shippingFee,
        address: customerAddress || undefined,
        payment_method: paymentMethod as any,
        notes: customerForm.notes,
      };

      const result = await createOrder(orderData);

      // Auto create transaction if payment was manual (e.g. maquininha)
      if (paymentMethod === 'maquininha') {
        const transactionData: Partial<Transaction> = {
          type: 'income',
          category: 'Sales',
          value: parseFloat(String(result.total || cartTotal + shippingFee)),
          description: `Pagamento no cartão - Pedido #${result.id}`,
          date: new Date().toISOString()
        };
        try {
          await createTransaction(transactionData);
        } catch (err) {
          console.error('Failed to create manual transaction', err);
        }
      }

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
      setPixConfirmed(false);

      if (paymentMethod === 'pix') {
        try {
          const nameParts = customerForm.name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Silva';

          const payment = await createPixPayment({
            orderId: result.id,
            email: customerForm.email.trim(),
            phone: customerForm.phone,
            firstName,
            lastName,
            identificationNumber: customerForm.cpf.replace(/\D/g, ''),
          });

          setOrderResult((prev: any) => ({ ...prev, pix: payment }));
        } catch (paymentErr) {
          console.error('Erro ao gerar Pix:', paymentErr);
          toast.error(
            'Pedido criado, mas não conseguimos gerar o QR Code Pix. Tente novamente em "Meus Pedidos".'
          );
        }
      } else {
        sendWhatsAppReceipt(result, result.items || orderItems, paymentMethod);
      }

      toast.success('Pedido enviado com sucesso.');
      return true;
    } catch (err: any) {
      const msg = err.message || 'Não foi possível finalizar o pedido.';
      setError(msg);
      toast.error(msg, 'Falha no pedido');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (orderResult?.pix?.id && !pixConfirmed) {
      interval = setInterval(async () => {
        try {
          const status = await getPixPaymentStatus(orderResult.pix.id, {
            orderId: orderResult.id,
            phone: orderResult.customer_phone,
          });
          if (status.status === 'approved') {
            setPixConfirmed(true);
            clearInterval(interval);
            toast.success('Pagamento Pix confirmado!', 'Sucesso');
            sendWhatsAppReceipt(orderResult, orderResult.items || [], 'pix');
          }
        } catch (err) {
          console.error('Erro no polling do Pix:', err);
        }
      }, 5000);
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
    sendWhatsAppReceipt,
    shippingFee,
    shippingOptions,
    calculatingShipping,
    loyaltyBalance,
    pointsToRedeem, setPointsToRedeem,
    usePoints, setUsePoints
  };
}
