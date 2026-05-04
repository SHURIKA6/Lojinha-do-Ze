import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useCart } from '@/features/storefront/hooks/useCart';
import { useAuth } from '@/core/contexts/AuthContext';
import { createOrder, CreateOrderData } from '@/core/api/orders';
import { createTransaction, Transaction } from '@/core/api/transactions';
import { getShippingOptions, ShippingOption } from '@/core/api/shipping';
import { toast } from '@/components/ui/ToastProvider';
import { Order, PaymentMethod } from '@/types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
}

interface UseCheckoutReturn {
  cart: CartItem[];
  customerForm: CustomerForm;
  setCustomerForm: React.Dispatch<React.SetStateAction<CustomerForm>>;
  deliveryType: 'delivery' | 'pickup';
  setDeliveryType: React.Dispatch<React.SetStateAction<'delivery' | 'pickup'>>;
  deliveryAddress: string;
  setDeliveryAddress: React.Dispatch<React.SetStateAction<string>>;
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  shippingOptions: ShippingOption[];
  selectedShipping: ShippingOption | null;
  setSelectedShipping: React.Dispatch<React.SetStateAction<ShippingOption | null>>;
  loadingShipping: boolean;
  cartTotal: number;
  deliveryFee: number;
  totalWithDelivery: number;
  error: string | null;
  success: boolean;
  orderId: string | null;
  handleCheckout: () => Promise<void>;
  clearCart: () => void;
}

export function useCheckout(): UseCheckoutReturn {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const cartTotal = cart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryType === 'delivery' && selectedShipping ? selectedShipping.price : 0;
  const totalWithDelivery = cartTotal + deliveryFee;

  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (deliveryType === 'delivery' && customerCoords && cart.length > 0) {
      setLoadingShipping(true);
      getShippingOptions(customerCoords, cartTotal)
        .then((res) => {
          setShippingOptions(res.options || []);
          if (res.options && res.options.length > 0) {
            setSelectedShipping(res.options[0]);
          }
        })
        .catch(() => {
          setShippingOptions([]);
        })
        .finally(() => {
          setLoadingShipping(false);
        });
    } else {
      setShippingOptions([]);
      setSelectedShipping(null);
    }
  }, [deliveryType, customerCoords, cartTotal, cart.length]);

  useEffect(() => {
    if (deliveryType === 'delivery' && deliveryAddress) {
      const abortController = new AbortController();
      
      setTimeout(() => {
        if (!abortController.signal.aborted) {
          setCustomerCoords({ lat: -15.7801, lng: -47.9292 });
        }
      }, 500);

      return () => {
        abortController.abort();
      };
    }
  }, [deliveryType, deliveryAddress]);

  const sendWhatsAppReceipt = (order: Order, items: CartItem[], method: string) => {
    const zePhone = process.env.NEXT_PUBLIC_ZE_PHONE;
    if (!zePhone) {
      toast.error('Número de WhatsApp não configurado. Por favor, contate o administrador.');
      return;
    }
    const methodLabel = method === 'pix' ? 'PIX' : 'Maquininha na entrega';
    let message = `COMPROVANTE DE PEDIDO - LOJINHA DO ZÉ\n`;
    message += `Olá José! Acabei de finalizar um pedido na loja:\n`;
    message += `Código do pedido: #${order.id}\n`;
    message += `Cliente: ${order.customer_name}\n`;
    message += `Telefone: ${order.customer_phone}\n`;
    message += `Modalidade: ${order.delivery_type === 'entrega' ? 'Entrega' : 'Retirada no Balcão'}\n`;
    message += `Pagamento: ${methodLabel}\n`;
    message += `Itens:\n`;
    items.forEach((item) => {
      message += `  - ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    if (order.delivery_type === 'entrega') {
      message += `  - Taxa de Entrega - R$ ${parseFloat(order.delivery_fee || '0').toFixed(2).replace('.', ',')}\n`;
    }
    message += `\nTotal Geral: R$ ${parseFloat(order.total).toFixed(2).replace('.', ',')}\n`;
    if (order.delivery_type === 'entrega' && order.address) {
      message += `\nEndereço: ${order.address}\n`;
    }
    if (order.notes) {
      message += `\nObs: ${order.notes}`;
    }

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
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      setError('Endereço de entrega é obrigatório para entrega.');
      return;
    }

    setError(null);

    try {
      const orderData: CreateOrderData = {
        user_id: user?.id || '',
        customer_name: customerForm.name,
        customer_phone: customerForm.phone,
        customer_email: customerForm.email || undefined,
        delivery_type: deliveryType === 'delivery' ? 'entrega' : 'retirada',
        address: deliveryType === 'delivery' ? deliveryAddress : undefined,
        delivery_fee: deliveryType === 'delivery' && selectedShipping ? String(selectedShipping.price) : undefined,
        payment_method: paymentMethod === 'maquininha' ? 'maquininha' : paymentMethod,
        notes: '',
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
      };

      const order = await createOrder(orderData);
      setOrderId(String(order.id));

      if (paymentMethod === 'maquininha') {
        const transactionData: Partial<Transaction> = {
          order_id: String(order.id),
          type: 'income',
          amount: parseFloat(String(order.total)),
          description: `Pagamento no cartão - Pedido #${order.id}`,
          status: 'pending',
        };
        await createTransaction(transactionData);
      }

      sendWhatsAppReceipt(order, cart, paymentMethod);
      setSuccess(true);
      clearCart();
      
      toast.success('Pedido realizado com sucesso!');
      
      setTimeout(() => {
        router.push(`/pedido/${order.id}`);
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pedido. Tente novamente.';
      setError(message);
    }
  };

  return {
    cart,
    customerForm,
    setCustomerForm,
    deliveryType,
    setDeliveryType,
    deliveryAddress,
    setDeliveryAddress,
    paymentMethod,
    setPaymentMethod,
    shippingOptions,
    selectedShipping,
    setSelectedShipping,
    loadingShipping,
    cartTotal,
    deliveryFee,
    totalWithDelivery,
    error,
    success,
    orderId,
    handleCheckout,
    clearCart,
  };
}
