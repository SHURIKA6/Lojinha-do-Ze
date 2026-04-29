import { Hono } from 'hono';
import { adminOnly, authMiddleware } from '../../core/middleware/auth';
import { jsonError, jsonSuccess, setNoStore } from '../../core/utils/http';
import { logger } from '../../core/utils/logger';
import BusinessIntelligenceService from './biService';
import DemandForecastService from './forecastService';
import { Bindings, Variables } from '../../core/types';

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

/**
 * GET /api/analytics/summary
 * Resumo geral de faturamento e pedidos
 */
router.get('/summary', async (c) => {
  const db = c.get('db');
  
  try {
    const [revenueRes, totalOrdersRes] = await Promise.all([
      db.query("SELECT SUM(value) as total FROM transactions WHERE type = 'receita'"),
      db.query("SELECT COUNT(*) as count, SUM(total) as total_value FROM orders WHERE status != 'cancelado'")
    ]);

    const totalRevenue = parseFloat(revenueRes.rows[0]?.total || '0');
    const totalOrdersCount = parseInt(totalOrdersRes.rows[0]?.count || '0');
    const avgTicket = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;

    setNoStore(c as any);
    return jsonSuccess(c, {
      totalRevenue,
      avgTicket,
      totalOrders: totalOrdersCount
    });
  } catch (error) {
    logger.error('Erro no Analytics / Summary', error as Error);
    return jsonError(c, 500, 'Erro ao carregar resumo analítico');
  }
});

/**
 * GET /api/analytics/revenue-chart
 * Dados de faturamento diário para gráfico
 */
router.get('/revenue-chart', async (c) => {
  const db = c.get('db');
  
  try {
    const { rows } = await db.query(`
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as day,
        SUM(value) as revenue
      FROM transactions 
      WHERE type = 'receita' 
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `);

    setNoStore(c as any);
    return jsonSuccess(c, rows);
  } catch (error) {
    logger.error('Erro no Analytics / Revenue Chart', error as Error);
    return jsonError(c, 500, 'Erro ao carregar dados do gráfico');
  }
});

/**
 * GET /api/analytics/best-sellers
 * Top 5 produtos mais vendidos
 */
router.get('/best-sellers', async (c) => {
  const db = c.get('db');
  
  try {
    const { rows } = await db.query(`
      SELECT 
        product_name as name,
        SUM(quantity) as total_sold
      FROM inventory_log
      WHERE type = 'saida' AND reason LIKE 'Pedido%'
      GROUP BY name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    setNoStore(c as any);
    return jsonSuccess(c, rows);
  } catch (error) {
    logger.error('Erro no Analytics / Best Sellers', error as Error);
    return jsonError(c, 500, 'Erro ao carregar produtos mais vendidos');
  }
});
