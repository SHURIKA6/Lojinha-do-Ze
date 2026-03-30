/**
 * Serviço de Business Intelligence
 * Implementa análises avançadas e recomendações inteligentes
 */

import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';

/**
 * Tipos de recomendação
 */
const RECOMMENDATION_TYPES = {
  PRODUCT: 'product',
  CATEGORY: 'category',
  PRICE: 'price',
  PROMOTION: 'promotion',
  STOCK: 'stock'
};

/**
 * Algoritmos de recomendação
 */
const RECOMMENDATION_ALGORITHMS = {
  COLLABORATIVE: 'collaborative',
  CONTENT_BASED: 'content_based',
  HYBRID: 'hybrid',
  TRENDING: 'trending'
};

class BusinessIntelligenceService {
  constructor() {
    this.userProfiles = new Map();
    this.productFeatures = new Map();
    this.interactions = [];
    this.recommendations = new Map();
  }

  /**
   * Gera recomendações personalizadas para um usuário
   */
  async generatePersonalizedRecommendations(userId, options = {}) {
    try {
      const cacheKey = `recommendations:${userId}`;
      let recommendations = cacheService.get(cacheKey);
      
      if (!recommendations) {
        // Carrega perfil do usuário
        const userProfile = await this.getUserProfile(userId);
        
        // Carrega produtos disponíveis
        const availableProducts = await this.getAvailableProducts();
        
        // Aplica algoritmos de recomendação
        recommendations = await this.applyRecommendationAlgorithms(
          userProfile, 
          availableProducts, 
          options
        );
        
        // Cache por 1 hora
        cacheService.set(cacheKey, recommendations, 3600);
      }
      
      return { success: true, recommendations };
    } catch (error) {
      logger.error('Erro ao gerar recomendações personalizadas', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Carrega perfil do usuário
   */
  async getUserProfile(userId) {
    // Simula carregamento de perfil
    return {
      id: userId,
      preferences: {
        categories: ['Óleos Essenciais', 'Chás e Infusões'],
        priceRange: { min: 10, max: 100 },
        brands: ['Natureza Viva', 'Ervas do Monte']
      },
      purchaseHistory: [
        { productId: 1, quantity: 2, date: '2026-03-15' },
        { productId: 5, quantity: 1, date: '2026-03-10' }
      ],
      behavior: {
        averageOrderValue: 85.50,
        purchaseFrequency: 'monthly',
        preferredPaymentMethod: 'pix'
      }
    };
  }

  /**
   * Carrega produtos disponíveis
   */
  async getAvailableProducts() {
    // Simula carregamento de produtos
    return [
      { id: 1, name: 'Óleo Essencial de Lavanda', category: 'Óleos Essenciais', price: 45.00, rating: 4.8 },
      { id: 2, name: 'Chá de Camomila', category: 'Chás e Infusões', price: 12.00, rating: 4.5 },
      { id: 3, name: 'Mel Silvestre', category: 'Naturais', price: 35.00, rating: 4.9 },
      { id: 4, name: 'Sabonete de Argila', category: 'Cosméticos Naturais', price: 15.00, rating: 4.3 }
    ];
  }

  /**
   * Aplica algoritmos de recomendação
   */
  async applyRecommendationAlgorithms(userProfile, products, options) {
    const recommendations = [];
    
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
  contentBasedFiltering(userProfile, products) {
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
  collaborativeFiltering(userProfile, products) {
    // Simula recomendações de usuários similares
    const similarUsersRecommendations = [
      { productId: 2, score: 0.85 },
      { productId: 3, score: 0.78 }
    ];
    
    return similarUsersRecommendations
      .map(rec => {
        const product = products.find(p => p.id === rec.productId);
        if (!product) return null;
        
        return {
          ...product,
          score: rec.score,
          algorithm: RECOMMENDATION_ALGORITHMS.COLLABORATIVE,
          reason: 'Usuários similares compraram este produto'
        };
      })
      .filter(Boolean);
  }

  /**
   * Recomendações de produtos em tendência
   */
  trendingRecommendations(products) {
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
  calculateContentScore(product, userProfile) {
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
  deduplicateAndRank(recommendations) {
    const seen = new Set();
    const unique = [];
    
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
  async detectPaymentFraud(paymentData) {
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
    } catch (error) {
      logger.error('Erro na detecção de fraude', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calcula score de fraude
   */
  async calculateFraudScore(paymentData) {
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
  determineRiskLevel(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'minimal';
  }

  /**
   * Detecta bandeiras de fraude
   */
  detectFraudFlags(paymentData) {
    const flags = [];
    
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
  generateFraudRecommendations(score, riskLevel) {
    const recommendations = [];
    
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
  async predictStockDemand(productId, daysAhead = 30) {
    try {
      const historicalData = await this.getHistoricalSalesData(productId);
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
    } catch (error) {
      logger.error('Erro na previsão de estoque', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém dados históricos de vendas
   */
  async getHistoricalSalesData(productId) {
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
      trend: 'increasing'
    };
  }

  /**
   * Calcula previsão de demanda
   */
  async calculateDemandPrediction(historicalData, daysAhead) {
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
  generateStockRecommendations(prediction) {
    const recommendations = [];
    
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
  async analyzeReviewSentiment(reviews) {
    try {
      const analyses = reviews.map(review => this.analyzeSingleReview(review));
      
      const summary = {
        totalReviews: reviews.length,
        averageSentiment: analyses.reduce((sum, a) => sum + a.sentiment, 0) / analyses.length,
        positiveCount: analyses.filter(a => a.sentiment > 0.6).length,
        negativeCount: analyses.filter(a => a.sentiment < 0.4).length,
        neutralCount: analyses.filter(a => a.sentiment >= 0.4 && a.sentiment <= 0.6).length,
        topKeywords: this.extractTopKeywords(analyses),
        recommendations: this.generateSentimentRecommendations(analyses)
      };
      
      return { success: true, summary, details: analyses };
    } catch (error) {
      logger.error('Erro na análise de sentimento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analisa sentimento de uma avaliação
   */
  analyzeSingleReview(review) {
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
  extractKeywords(text) {
    const words = text.split(/\s+/);
    const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na'];
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5);
  }

  /**
   * Extrai palavras-chave mais frequentes
   */
  extractTopKeywords(analyses) {
    const keywordCounts = {};
    
    for (const analysis of analyses) {
      for (const keyword of analysis.keywords) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }
    
    return Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  }

  /**
   * Gera recomendações baseadas em sentimento
   */
  generateSentimentRecommendations(analyses) {
    const recommendations = [];
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
    } catch (error) {
      logger.error('Erro ao obter estatísticas de BI', error);
      return { success: false, error: error.message };
    }
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();
export { RECOMMENDATION_TYPES, RECOMMENDATION_ALGORITHMS };
export default BusinessIntelligenceService;