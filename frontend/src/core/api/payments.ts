/**
 * API: payments
 */

import { request } from './client';
import { ApiResponse } from '@/types';

export interface PixPaymentData {
  orderId: string | number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  identificationNumber: string;
}

export interface PixPaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  external_reference: string;
}

export interface PixStatusResponse {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  id: string;
  external_reference: string;
}

/**
 * Cria um pagamento via Pix
 */
export async function createPixPayment(data: PixPaymentData): Promise<PixPaymentResponse> {
  const res = await request<any>('/payments/pix', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res && res.id) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao gerar Pix');
}

/**
 * Consulta o status de um pagamento Pix
 */
export async function getPixPaymentStatus(
  paymentId: string,
  params: { orderId: string | number; phone?: string }
): Promise<PixStatusResponse> {
  const query = new URLSearchParams({
    orderId: String(params.orderId),
    phone: String(params.phone || ''),
  });

  const res = await request<any>(`/payments/pix/${paymentId}?${query.toString()}`);
  if (res && res.status) return res;
  if (res?.data) return res.data;
  throw new Error(res?.message || 'Erro ao consultar status');
}
