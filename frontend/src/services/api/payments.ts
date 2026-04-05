import { request } from './client';

export interface PixPaymentData {
  orderId: string | number;
  email: string;
  firstName: string;
  lastName: string;
  identificationNumber: string;
  phone?: string;
}

/**
 * Cria um pagamento via Pix
 */
export async function createPixPayment(data: PixPaymentData) {
  return request('/payments/pix', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Consulta o status de um pagamento Pix
 */
export async function getPixPaymentStatus(paymentId: string | number, { orderId, phone }: { orderId: string | number; phone?: string }) {
  const query = new URLSearchParams({
    orderId: String(orderId),
    phone: String(phone || ''),
  });

  return request(`/payments/pix/${paymentId}?${query.toString()}`);
}
