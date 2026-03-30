import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../middleware/auth.js';
import { jsonError, setNoStore } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import BusinessIntelligenceService from '../services/businessIntelligenceService.js';
import DemandForecastService from '../services/demandForecastService.js';

const router = new Hono();

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
    const forecasts = products.map(p => {
      // Mock de histórico para demonstração (em prod, bateria na tabela 'transactions')
      const mockHistory = Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 10);
      return {
        id: p.id,
        name: p.name,
        currentStock: p.quantity,
        movingAverage: forecastService.calculateMovingAverage(mockHistory, 3),
        regression: forecastService.calculateLinearRegression(mockHistory, 12),
        seasonality: forecastService.detectSeasonality(mockHistory)
      };
    });

    setNoStore(c);
    return c.json({ forecasts });
  } catch (error) {
    logger.error('Erro no Analytics / Forecast', error);
    return jsonError(c, 500, 'Erro ao gerar previsão de demanda.');
  }
});

// Ações do Business Intelligence (Fraude, Recomendações etc)
router.get('/bi/sentiment', async (c) => {
  try {
    // Na nossa simulação, pegamos comentários dos clientes para analisar
    // Aqui usaremos dados estáticos mockados mas baseados no serviço
    const reviewsText = [
      "Ótimo produto, chegou muito rápido!",
      "Produto veio quebrado, péssima qualidade.",
      "Mais ou menos. Tinha expectativas boas mas não surpreendeu."
    ];
    
    const analysis = reviewsText.map(t => biService.analyzeReviewSentiment(t));
    setNoStore(c);
    return c.json({ sentimentAnalysis: analysis });
  } catch(error) {
    logger.error('Erro no Analytics / Sentiment', error);
    return jsonError(c, 500, 'Erro ao gerar análise de sentimento.');
  }
});

export default router;
