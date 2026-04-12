import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth';
import { jsonError, setNoStore } from '../utils/http';
import { logger } from '../utils/logger';
import BusinessIntelligenceService from '../services/businessIntelligenceService';
import DemandForecastService from '../services/demandForecastService';
import { Bindings, Variables } from '../types';

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Instâncias dos serviços
const biService = new BusinessIntelligenceService();
const forecastService = new DemandForecastService();

router.use('*', authMiddleware, adminOnly);

// Rota para Previsão de Demanda (Estoque)
router.get('/forecast', async (c) => {
  try {
    const db = c.get('db');
    // Pegar histórico de vendas para previsão (simulação simplificada chamando o serviço)
    const { rows: products } = await db.query(
      `SELECT id, name, quantity, min_stock FROM products WHERE is_active = true LIMIT 50`
    );
    
    // Gerar relatórios de previsão para produtos (usando Regressão Linear ou Média Móvel)
    const forecasts = products.map((p: { id: string; name: string; quantity: number; min_stock: number }) => {
      // Mock de histórico para demonstração (em prod, bateria na tabela 'transactions')
      const mockHistory = Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 10);
      return {
        id: p.id,
        name: p.name,
        currentStock: p.quantity,
        movingAverage: forecastService.calculateMovingAverage(mockHistory, 3),
        regression: forecastService.calculateLinearRegression(mockHistory, 12),
        seasonality: forecastService.detectSeasonality(mockHistory as any)
      };
    });

    setNoStore(c as any);
    return c.json({ forecasts });
  } catch (error) {
    logger.error('Erro no Analytics / Forecast', error as Error);
    return jsonError(c, 500, 'Erro ao gerar previsão de demanda.');
  }
});

// Ações do Business Intelligence (Fraude, Recomendações etc)
router.get('/bi/sentiment', async (c) => {
  try {
    // Na nossa simulação, pegamos comentários dos clientes para analisar
    // Aqui usaremos dados estáticos mockados mas baseados no serviço
    const reviewsText = [
      { id: 1, text: "Ótimo produto, chegou muito rápido!", timestamp: new Date().toISOString() },
      { id: 2, text: "Produto veio quebrado, péssima qualidade.", timestamp: new Date().toISOString() },
      { id: 3, text: "Mais ou menos. Tinha expectativas boas mas não surpreendeu.", timestamp: new Date().toISOString() }
    ];
    
    const analysis = reviewsText.map(t => biService.analyzeSingleReview(t));
    setNoStore(c as any);
    return c.json({ sentimentAnalysis: analysis });
  } catch(error) {
    logger.error('Erro no Analytics / Sentiment', error as Error);
    return jsonError(c, 500, 'Erro ao gerar análise de sentimento.');
  }
});

export default router;
