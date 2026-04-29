import { Hono } from 'hono';
import { jsonError, jsonSuccess } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { shippingService } from './shippingService';
import { Bindings, Variables } from '../../core/types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/shipping/calculate
 * Calcula opções de frete para um endereço/coordenadas
 */
router.post('/calculate', async (c) => {
  try {
    const { coordinates, cartTotal } = await c.req.json() as { 
      coordinates: { lat: number; lng: number }; 
      cartTotal: number;
    };

    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return jsonError(c, 400, 'Coordenadas inválidas ou não fornecidas.');
    }

    const options = await shippingService.calculateOptions(coordinates, cartTotal || 0);

    return jsonSuccess(c, {
      options,
      distance: shippingService.calculateDistance(
        { lat: -11.8596, lng: -55.5031 }, // Store location
        coordinates
      )
    });
  } catch (error) {
    logger.error('Erro na rota de cálculo de frete', error as Error);
    return jsonError(c, 500, 'Erro ao calcular frete.');
  }
});

export default router;
