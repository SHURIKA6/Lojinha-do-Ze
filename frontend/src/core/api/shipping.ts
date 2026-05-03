/**
 * API: shipping
 */

import { request } from './index';

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

/**
 * Calcula opções de frete baseadas em coordenadas e valor do pedido
 */
export async function calculateShipping(coordinates: { lat: number; lng: number }, cartTotal: number): Promise<CalculateShippingResponse> {
  const res = await request<any>('/shipping/calculate', {
    method: 'POST',
    body: JSON.stringify({ coordinates, cartTotal }),
  });

  if (res?.data) return res.data;
  return res;
}
