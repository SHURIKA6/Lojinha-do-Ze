/**
 * Serviço de Logística e Frete
 * Responsável por calcular distâncias e preços de entrega
 */

import { logger } from '../../core/utils/logger';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  description: string;
}

// Localização da Loja (Zé Paulo) - Exemplo: Sinop, MT
const STORE_LOCATION: Coordinates = {
  lat: -11.8596,
  lng: -55.5031
};

export class ShippingService {
  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine (em km)
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  /**
   * Calcula as opções de frete baseadas na distância e valor do pedido
   */
  async calculateOptions(customerCoords: Coordinates, cartTotal: number): Promise<ShippingOption[]> {
    try {
      const distance = this.calculateDistance(STORE_LOCATION, customerCoords);
      const options: ShippingOption[] = [];

      // Regra de Frete Grátis
      const isFreeShipping = cartTotal >= 150;

      // 1. Entrega Local (Motoboy)
      if (distance <= 20) {
        let price = 5.0;
        if (distance > 5) price = 8.0;
        if (distance > 10) price = 12.0;
        if (isFreeShipping) price = 0;

        options.push({
          id: 'local_motoboy',
          name: 'Entrega Local (Motoboy)',
          price,
          estimatedDays: 0, // Mesmo dia
          description: distance <= 2 ? 'Entrega rapidinha!' : `Distância: ${distance.toFixed(1)}km`
        });
      }

      // 2. Entrega Regional/Nacional (Simulação de Transportadora)
      if (distance > 5) {
        let carrierPrice = 15.0 + (distance * 0.5); // Base + R$ 0.50 por km
        if (isFreeShipping) carrierPrice = Math.max(0, carrierPrice - 15.0); // Desconto de R$ 15 no frete

        options.push({
          id: 'carrier_standard',
          name: 'Transportadora Padrão',
          price: Number(carrierPrice.toFixed(2)),
          estimatedDays: distance > 100 ? 3 : 1,
          description: 'Entrega segura via parceiro logístico'
        });
      }

      return options;
    } catch (error) {
      logger.error('Erro ao calcular opções de frete', error as Error);
      return [];
    }
  }
}

export const shippingService = new ShippingService();
export default ShippingService;
