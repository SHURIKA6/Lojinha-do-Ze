/**
 * Serviço de Business Intelligence
 * Implementa análises avançadas e recomendações inteligentes
 */

import { logger } from '../../core/utils/logger';
import { cacheService } from '../system/cacheService';
import { Database, Bindings, ExecutionContext, PaymentFraudData, StockPrediction, ReviewAnalysis, HistoricalSalesData } from '../../core/types';

/**
 * Tipos de recomendação
 */
export const RECOMMENDATION_TYPES = {
  PRODUCT: 'product',
  CATEGORY: 'category',
  PRICE: 'price',
  PROMOTION: 'promotion',
  STOCK: 'stock'
} as const;

/**
 * Algoritmos de recomendação
 */
export const RECOMMENDATION_ALGORITHMS = {
  COLLABORATIVE: 'collaborative',
  CONTENT_BASED: 'content_based',
  HYBRID: 'hybrid',
  TRENDING: 'trending'
} as const;

export type RecommendationType = typeof RECOMMENDATION_TYPES[keyof typeof RECOMMENDATION_TYPES];
export type RecommendationAlgorithm = typeof RECOMMENDATION_ALGORITHMS[keyof typeof RECOMMENDATION_ALGORITHMS];

export interface RecommendationOptions {
  limit?: number;
}

export interface UserProfile {
  id: string | number;
  preferences: {
    categories: string[];
    priceRange: { min: number; max: number };
    brands: string[];
  };
  purchaseHistory: Array<{ productId: number; quantity: number; date: string }>;
  behavior: {
    averageOrderValue: number;
    purchaseFrequency: string;
    preferredPaymentMethod: string;
  };
}

export interface ProductRecommendation {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  score: number;
  algorithm: RecommendationAlgorithm;
  reason: string;
}

interface RecommendationProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
}

export class BusinessIntelligenceService {
  private userProfiles = new Map<string | number, UserProfile>();
  private productFeatures = new Map<number, RecommendationProduct>();
  private interactions: Record<string, unknown>[] = [];
  private recommendations = new Map<string | number, ProductRecommendation[]>();
  private historicalData = new Map<number, HistoricalSalesData>();

  constructor() {}

  /**
   * Gera recomendações personalizadas para um usuário
   */
  async generatePersonalizedRecommendations(db: Database, userId: string | number, options: RecommendationOptions & { env?: Bindings, ctx?: ExecutionContext } = {}) {
    const { env, ctx } = options;
    try {
      const cacheKey = `recommendations:${userId}`;
      let recommendations = await cacheService.get(cacheKey, env?.CACHE_KV, ctx);
      
      if (!recommendations) {
        // Carrega perfil do usuário
        const userProfile = await this.getUserProfile(db, userId);
        
        // Carrega produtos disponíveis
        const availableProducts = await this.getAvailableProducts(db);
        
        // Aplica algoritmos de recomendação
        recommendations = await this.applyRecommendationAlgorithms(
          userProfile, 
          availableProducts, 
          options
        );
        
        // Cache por 1 hora
        await cacheService.set(cacheKey, recommendations, 3600, env?.CACHE_KV, ctx);
      }
      
      return { success: true, recommendations };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao gerar recomendações personalizadas', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Gera recomendações em lote para múltiplos usuários
   */
  async generateBatchRecommendations(db: Database, userIds: (string | number)[], options: RecommendationOptions & { env?: Bindings, ctx?: ExecutionContext } = {}) {
    const { env, ctx } = options;
    try {
      const results = [];
      for (const userId of userIds) {
        const result = await this.generatePersonalizedRecommendations(db, userId, options);
        if (result.success) {
          results.push({ userId, recommendations: result.recommendations });
        }
      }
      return { success: true, results };
    } catch (error) {
      logger.error('Erro ao gerar recomendações em lote', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Carrega perfil do usuário do banco de dados
   */
  async getUserProfile(db: any, userId: string | number): Promise<UserProfile> {
    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRows[0];

    const { rows: orderRows } = await db.query(`
      SELECT items, total, created_at 
      FROM orders 
      WHERE customer_id = $1 AND status = 'concluido'
      ORDER BY created_at DESC
    `, [userId]);

    const categories = new Set<string>();
    const purchaseHistory: any[] = [];
    let totalSpent = 0;

    orderRows.forEach((order: any) => {
      totalSpent += Number(order.total);
      const items = order.items;
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          categories.add(item.category);
          purchaseHistory.push({
            productId: item.id,
            quantity: item.quantity,
            date: order.created_at
          });
        });
      }
    });

    return {
      id: userId,
      preferences: {
        categories: Array.from(categories),
        priceRange: { min: 0, max: 1000 },
        brands: []
      },
      purchaseHistory,
      behavior: {
        averageOrderValue: orderRows.length > 0 ? totalSpent / orderRows.length : 0,
        purchaseFrequency: 'monthly',
        preferredPaymentMethod: 'unknown'
      }
    };
  }

  /**
   * Carrega produtos disponíveis do banco de dados
   */
  async getAvailableProducts(db: any): Promise<RecommendationProduct[]> {
    const { rows } = await db.query(`
      SELECT id, name, category, sale_price as price, 5.0 as rating 
      FROM products 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    return rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      category: r.category,
      price: Number(r.price),
      rating: Number(r.rating)
    }));
  }

  /**
   * Aplica algoritmos de recomendação
   */
  async applyRecommendationAlgorithms(
    userProfile: UserProfile,
    products: RecommendationProduct[],
    options: RecommendationOptions
  ): Promise<ProductRecommendation[]> {
    const recommendations: ProductRecommendation[] = [];
    
    // Recomendação baseada em conteúdo
    const contentBased = this.contentBasedFiltering(userProfile, products);
    recommendations.push(...contentBased);
    
    // Recomendação colaborativa (simulada)
    const collaborative = this.collaborativeFiltering(userProfile, products);
    recommendations.push(...collaborative);
    
    // Recomendação de produtos em tendência
    const trending = this.trendingRecommendations(products);
    recommendations.push(...trending);
    
    // Remove duplicatas e ordena por score
    const uniqueRecommendations = this.deduplicateAndRank(recommendations);
    
    return uniqueRecommendations.slice(0, options.limit || 10);
  }

  /**
   * Filtragem baseada em conteúdo
   */
  contentBasedFiltering(userProfile: UserProfile, products: RecommendationProduct[]): ProductRecommendation[] {
    return products
      .filter(product => {
        // Filtra por categorias preferidas
        const categoryMatch = userProfile.preferences.categories.includes(product.category);
        
        // Filtra por faixa de preço
        const priceMatch = product.price >= userProfile.preferences.priceRange.min && 
                          product.price <= userProfile.preferences.priceRange.max;
        
        return categoryMatch && priceMatch;
      })
      .map(product => ({
        ...product,
        score: this.calculateContentScore(product, userProfile),
        algorithm: RECOMMENDATION_ALGORITHMS.CONTENT_BASED,
        reason: 'Baseado nas suas preferências'
      }));
  }

  /**
   * Filtragem colaborativa (simulada)
   */
  collaborativeFiltering(_userProfile: UserProfile, products: RecommendationProduct[]): ProductRecommendation[] {
    // Simula recomendações de usuários similares
    const similarUsersRecommendations = [
      { productId: 2, score: 0.85 },
      { productId: 3, score: 0.78 }
    ];

    const recommendations: ProductRecommendation[] = [];

    for (const rec of similarUsersRecommendations) {
      const product = products.find((p) => p.id === rec.productId);
      if (!product) {
        continue;
      }

      recommendations.push({
        ...product,
        score: rec.score,
        algorithm: RECOMMENDATION_ALGORITHMS.COLLABORATIVE,
        reason: 'Usuários similares compraram este produto'
      });
    }

    return recommendations;
  }

  /**
   * Recomendações de produtos em tendência
   */
  trendingRecommendations(products: RecommendationProduct[]): ProductRecommendation[] {
    return products
      .filter(product => product.rating >= 4.5)
      .map(product => ({
        ...product,
        score: product.rating / 5,
        algorithm: RECOMMENDATION_ALGORITHMS.TRENDING,
        reason: 'Produto em alta avaliação'
      }));
  }

  /**
   * Calcula score baseado em conteúdo
   */
  calculateContentScore(product: RecommendationProduct, userProfile: UserProfile): number {
    let score = 0;
    
    // Score por categoria
    if (userProfile.preferences.categories.includes(product.category)) {
      score += 0.4;
    }
    
    // Score por faixa de preço
    const priceRange = userProfile.preferences.priceRange;
    if (product.price >= priceRange.min && product.price <= priceRange.max) {
      score += 0.3;
    }
    
    // Score por rating
    score += (product.rating / 5) * 0.3;
    
    return Math.min(score, 1.0);
  }

  /**
   * Remove duplicatas e ordena por score
   */
  deduplicateAndRank(recommendations: ProductRecommendation[]): ProductRecommendation[] {
    const seen = new Set<number>();
    const unique: ProductRecommendation[] = [];
    
    for (const rec of recommendations) {
      if (!seen.has(rec.id)) {
        seen.add(rec.id);
        unique.push(rec);
      }
    }
    
    return unique.sort((a, b) => b.score - a.score);
  }

  /**
   * Detecta fraudes em pagamentos
   */
  async detectPaymentFraud(paymentData: PaymentFraudData) {
    try {
      const fraudScore = await this.calculateFraudScore(paymentData);
      const riskLevel = this.determineRiskLevel(fraudScore);
      
      const analysis = {
        paymentId: paymentData.id,
        fraudScore,
        riskLevel,
        flags: this.detectFraudFlags(paymentData),
        recommendations: this.generateFraudRecommendations(fraudScore, riskLevel),
        timestamp: new Date().toISOString()
      };
      
      // Log para auditoria
      logger.info('Análise de fraude de pagamento', {
        paymentId: paymentData.id,
        fraudScore,
        riskLevel,
        flags: analysis.flags
      });
      
      return { success: true, analysis };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro na detecção de fraude', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calcula score de fraude
   */
  async calculateFraudScore(paymentData: PaymentFraudData): Promise<number> {
    let score = 0;
    
    // Verifica valor atípico
    if (paymentData.amount > 1000) score += 0.3;
    if (paymentData.amount > 5000) score += 0.5;
    
    // Verifica horário atípico
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) score += 0.2;
    
    // Verifica múltiplos pagamentos
    if (paymentData.attempts > 3) score += 0.4;
    
    // Verifica localização geográfica
    if (paymentData.location && paymentData.location.country !== 'BR') {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Determina nível de risco
   */
  determineRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' | 'minimal' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'minimal';
  }

  /**
   * Detecta bandeiras de fraude
   */
  detectFraudFlags(paymentData: PaymentFraudData) {
    const flags: Array<{ type: string; severity: string; message: string }> = [];
    
    if (paymentData.amount > 1000) {
      flags.push({
        type: 'high_value',
        severity: 'medium',
        message: 'Valor acima da média'
      });
    }
    
    if (paymentData.attempts > 3) {
      flags.push({
        type: 'multiple_attempts',
        severity: 'high',
        message: 'Múltiplas tentativas de pagamento'
      });
    }
    
    if (paymentData.location && paymentData.location.country !== 'BR') {
      flags.push({
        type: 'foreign_location',
        severity: 'medium',
        message: 'Localização geográfica suspeita'
      });
    }
    
    return flags;
  }

  /**
   * Gera recomendações de fraude
   */
  generateFraudRecommendations(score: number, riskLevel: string) {
    const recommendations: Array<{ action: string; priority: string; message: string }> = [];
    
    if (riskLevel === 'critical') {
      recommendations.push({
        action: 'block',
        priority: 'critical',
        message: 'Bloquear pagamento e solicitar verificação manual'
      });
    } else if (riskLevel === 'high') {
      recommendations.push({
        action: 'review',
        priority: 'high',
        message: 'Revisar pagamento manualmente antes de aprovar'
      });
    } else if (riskLevel === 'medium') {
      recommendations.push({
        action: 'monitor',
        priority: 'medium',
        message: 'Monitorar transação e coletar mais dados'
      });
    }
    
    return recommendations;
  }

  /**
   * Prevê demanda de estoque
   */
  /**
   * Prevê demanda de estoque (Integrado com o serviço de previsão)
   */
  async generateForecast(db: any, productId: number, daysAhead = 30, algorithm = 'moving_average', env?: any, ctx?: any) {
    try {
      // Carrega dados históricos se necessário
      if (!this.historicalData.has(productId)) {
        await this.loadHistoricalData(db, productId, 90, env, ctx);
      }
      
      const historicalData = this.historicalData.get(productId);
      if (!historicalData) {
        throw new Error(`Falha ao carregar dados históricos para o produto ${productId}`);
      }
      const prediction = await this.calculateDemandPrediction(historicalData, daysAhead);

      return {
        success: true,
        prediction: {
          productId,
          daysAhead,
          predictedDemand: prediction.demand,
          confidence: prediction.confidence,
          seasonality: prediction.seasonality,
          recommendations: this.generateStockRecommendations(prediction)
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro na previsão de estoque', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Carrega dados históricos de vendas do banco de dados
   */
  async loadHistoricalData(db: any, productId: number, days: number, _env?: any, _ctx?: any) {
    const { rows } = await db.query(`
      SELECT 
        created_at::date as date, 
        SUM(CASE 
          WHEN (item->>'quantity') ~ '^[0-9]+$' THEN (item->>'quantity')::int 
          ELSE 0 
        END) as quantity
      FROM orders, jsonb_array_elements(CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END) as item
      WHERE (item->>'productId')::int = $1 
        AND status = 'concluido'
        AND created_at >= NOW() - INTERVAL '1 day' * $2
      GROUP BY created_at::date
      ORDER BY date ASC
    `, [productId, days]);

    const sales = rows.map((r: any) => ({
      date: new Date(r.date).toISOString(),
      quantity: Number(r.quantity)
    }));

    const totalSales = sales.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const averageDailySales = sales.length > 0 ? totalSales / sales.length : 0;

    this.historicalData.set(productId, {
      productId,
      sales,
      averageDailySales,
      trend: 'stable'
    });
  }

  /**
   * Obtém dados históricos de vendas
   */
  async getHistoricalSalesData(productId: number): Promise<HistoricalSalesData> {
    // Simula dados históricos
    return {
      productId,
      sales: [
        { date: '2026-03-01', quantity: 15 },
        { date: '2026-03-02', quantity: 18 },
        { date: '2026-03-03', quantity: 12 },
        { date: '2026-03-04', quantity: 22 },
        { date: '2026-03-05', quantity: 19 }
      ],
      averageDailySales: 17.2,
      trend: 'increasing' as const
    };
  }

  /**
   * Calcula previsão de demanda
   */
  async calculateDemandPrediction(historicalData: HistoricalSalesData, daysAhead: number): Promise<StockPrediction> {
    const avgDaily = historicalData.averageDailySales;
    const trendFactor = historicalData.trend === 'increasing' ? 1.1 : 0.9;

    return {
      demand: Math.round(avgDaily * daysAhead * trendFactor),
      confidence: 0.75,
      seasonality: {
        factor: 1.2,
        pattern: 'weekly'
      }
    };
  }

  /**
   * Gera recomendações de estoque
   */
  generateStockRecommendations(prediction: StockPrediction) {
    const recommendations: Array<{ type: string; priority: string; message: string }> = [];

    if (prediction.demand > 100) {
      recommendations.push({
        type: 'increase_stock',
        priority: 'high',
        message: `Aumentar estoque para ${prediction.demand} unidades`
      });
    }

    if (prediction.confidence < 0.6) {
      recommendations.push({
        type: 'monitor_closely',
        priority: 'medium',
        message: 'Monitorar vendas de perto devido à baixa confiança na previsão'
      });
    }

    return recommendations;
  }

  /**
   * Analisa sentimento de avaliações
   */
  async analyzeReviewSentiment(reviews: Array<{ id: number; text: string; timestamp: string }>) {
    try {
      const analyses = reviews.map(review => this.analyzeSingleReview(review));
      
      const summary = {
        totalReviews: reviews.length,
        averageSentiment: reviews.length > 0 
          ? analyses.reduce((sum, a) => sum + a.sentiment, 0) / analyses.length 
          : 0.5,
        positiveCount: analyses.filter(a => a.sentiment > 0.6).length,
        negativeCount: analyses.filter(a => a.sentiment < 0.4).length,
        neutralCount: analyses.filter(a => a.sentiment >= 0.4 && a.sentiment <= 0.6).length,
        topKeywords: this.extractTopKeywords(analyses),
        recommendations: this.generateSentimentRecommendations(analyses)
      };
      
      return { success: true, summary, details: analyses };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro na análise de sentimento', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Analisa sentimento de uma avaliação
   */
  analyzeSingleReview(review: { id: number; text: string; timestamp: string }) {
    const text = review.text.toLowerCase();
    
    // Palavras positivas
    const positiveWords = ['bom', 'ótimo', 'excelente', 'adorei', 'perfeito', 'maravilhoso'];
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    
    // Palavras negativas
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'odiei', 'terrível', 'decepcionante'];
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    // Calcula sentimento (0 a 1)
    let sentiment = 0.5; // neutro
    if (positiveCount > negativeCount) {
      sentiment = 0.5 + (positiveCount * 0.1);
    } else if (negativeCount > positiveCount) {
      sentiment = 0.5 - (negativeCount * 0.1);
    }
    
    sentiment = Math.max(0, Math.min(1, sentiment));
    
    return {
      reviewId: review.id,
      text: review.text,
      sentiment,
      keywords: this.extractKeywords(text),
      timestamp: review.timestamp
    };
  }

  /**
   * Extrai palavras-chave
   */
  extractKeywords(text: string) {
    const words = text.split(/\s+/);
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na'];
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5);
  }

  /**
   * Extrai palavras-chave mais frequentes
   */
  extractTopKeywords(analyses: ReviewAnalysis[]) {
    const keywordCounts: Record<string, number> = {};

    for (const analysis of analyses) {
      for (const keyword of analysis.keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }

    return Object.entries(keywordCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  }

  /**
   * Gera recomendações baseadas em sentimento
   */
  generateSentimentRecommendations(analyses: ReviewAnalysis[]) {
    const recommendations: Array<{ type: string; priority: string; message: string }> = [];
    const negativeCount = analyses.filter(a => a.sentiment < 0.4).length;

    if (negativeCount > analyses.length * 0.3) {
      recommendations.push({
        type: 'improve_quality',
        priority: 'high',
        message: 'Mais de 30% das avaliações são negativas - melhorar qualidade dos produtos'
      });
    }

    return recommendations;
  }

  /**
   * Obtém estatísticas de BI
   */
  async getBIStats() {
    try {
      const stats = {
        totalRecommendations: this.recommendations.size,
        totalInteractions: this.interactions.length,
        totalUserProfiles: this.userProfiles.size,
        fraudDetectionRate: 0,
        recommendationAccuracy: 0
      };
      
      return { success: true, stats };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao obter estatísticas de BI', error);
      return { success: false, error: errorMessage };
    }
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();
export default BusinessIntelligenceService;
