import { request } from './client';

export interface PixPaymentData {
  orderId: string | number;
  email: string;
  firstName: string;
  lastName: string;
  identificationNumber: string;
  phone?: string;
}

export interface PixPaymentStatusLookup {
  orderId: string | number;
  lookupToken: string;
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
export async function getPixPaymentStatus(
  paymentId: string | number,
  { orderId, lookupToken }: PixPaymentStatusLookup
) {
  return request(`/payments/pix/${paymentId}/status`, {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      lookupToken,
    }),
  });
}
