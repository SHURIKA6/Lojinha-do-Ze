/**
 * API: payments
 */

import { request } from './client';
import { ApiResponse } from '@/types';
import { PixPaymentResponse, PixStatusResponse } from './payments';

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

export interface PaymentOptions {
  signal?: AbortSignal;
}

export async function createPixPayment(data: PixPaymentData, options?: PaymentOptions): Promise<PixPaymentResponse> {
  const res = await request<PixPaymentResponse | ApiResponse<PixPaymentResponse>>('/payments/pix', {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
  
  if (res && (res as PixPaymentResponse).id) return res as PixPaymentResponse;
  if (res && (res as ApiResponse<PixPaymentResponse>).data) return (res as ApiResponse<PixPaymentResponse>).data as PixPaymentResponse;
  throw new Error((res as ApiResponse)?.message || 'Erro ao gerar Pix');
}

export async function getPixPaymentStatus(
  paymentId: string,
  params: { orderId: string | number; phone?: string },
  options?: PaymentOptions
): Promise<PixStatusResponse> {
  const query = new URLSearchParams({
    orderId: String(params.orderId),
    phone: String(params.phone || ''),
  });

  const res = await request<PixStatusResponse | ApiResponse<PixStatusResponse>>(`/payments/pix/${paymentId}?${query.toString()}`, options || {});
  
  if (res && (res as PixStatusResponse).status) return res as PixStatusResponse;
  if (res && (res as ApiResponse<PixStatusResponse>).data) return (res as ApiResponse<PixStatusResponse>).data as PixStatusResponse;
  throw new Error((res as ApiResponse)?.message || 'Erro ao consultar status');
}
