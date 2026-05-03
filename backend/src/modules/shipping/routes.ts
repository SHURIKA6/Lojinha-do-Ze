import { Hono } from 'hono';
import { jsonError, jsonSuccess } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import { shippingService } from './shippingService';
import { Bindings, Variables } from '../../core/types';
import { logSystemEvent } from '../system/logService';

/**
 * Módulo de Rotas de Frete
 * Gerencia rotas HTTP para cálculo de frete.
 * Fornece endpoint para calcular opções de frete baseadas na localização do cliente e total do carrinho.
 */

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /api/shipping/calculate
 * Calcula opções de frete para um endereço/coordenadas
 */
router.post('/calculate', async (c) => {
  let coordinates: { lat: number; lng: number } | undefined;
  let cartTotal: number | undefined;
  
  try {
    const body = await c.req.json() as { 
      coordinates: { lat: number; lng: number }; 
      cartTotal: number;
    };
    coordinates = body.coordinates;
    cartTotal = body.cartTotal;

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
  } catch (error: any) {
    const errorId = crypto.randomUUID().split('-')[0];
    const db = c.get('db');
    
    logger.error(`Erro na rota de cálculo de frete [${errorId}]`, error, {
      coordinates,
      cartTotal
    });

    await logSystemEvent(db, c.env, 'error', `Erro Cálculo Frete [${errorId}]: ${error.message}`, {
      coordinates,
      cartTotal,
      errorId
    }, error).catch(err => logger.error('Falha ao logar erro de frete no banco', err));

    return jsonError(c, 500, 'Erro ao calcular frete.', { errorId });
  }
});

export default router;
