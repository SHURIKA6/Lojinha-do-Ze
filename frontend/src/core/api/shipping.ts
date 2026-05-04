/**
 * API: shipping
 */

import { request } from './index';
import { ApiResponse } from '@/types';

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  description: string;
}

export interface CalculateShippingResponse {
  options: ShippingOption[];
  distance: number;
}

export interface ShippingOptions {
  signal?: AbortSignal;
}

export async function calculateShipping(
  coordinates: { lat: number; lng: number }, 
  cartTotal: number, 
  options?: ShippingOptions
): Promise<CalculateShippingResponse> {
  const res = await request<CalculateShippingResponse | ApiResponse<CalculateShippingResponse>>('/shipping/calculate', {
    method: 'POST',
    body: JSON.stringify({ coordinates, cartTotal }),
    ...options,
  });
  
  if (res && (res as ApiResponse<CalculateShippingResponse>).data) {
    return (res as ApiResponse<CalculateShippingResponse>).data as CalculateShippingResponse;
  }
  return res as CalculateShippingResponse;
}
