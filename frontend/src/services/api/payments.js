import { request } from './client';

/**
 * Cria um pagamento via Pix
 * @param {Object} data { orderId, email, firstName, lastName, identificationNumber }
 */
export async function createPixPayment(data) {
  return request('/payments/pix', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Consulta o status de um pagamento Pix
 * @param {string} paymentId 
 */
export async function getPixPaymentStatus(paymentId) {
  return request(`/payments/pix/${paymentId}`);
}
