/**
 * Serviço de Análise de Comportamento do Cliente
 * Rastreia e analisa padrões de comportamento dos clientes
 */

import { logger } from '../utils/logger.js';

/**
 * Tipos de comportamento
 */
const BEHAVIOR_TYPES = {
  PURCHASE: 'purchase',
  BROWSE: 'browse',
  SEARCH: 'search',
  CART_ABANDON: 'cart_abandon',
  WISHLIST: 'wishlist',
  REVIEW: 'review'
};

/**
 * Segmentos de clientes
 */
const CUSTOMER_SEGMENTS = {
  VIP: 'vip',
  REGULAR: 'regular',
  NEW: 'new',
  AT_RISK: 'at_risk',
  CHURNED: 'churned'
};

class CustomerBehaviorService {
  constructor() {
    this.behaviorData = new Map();
    this.customerProfiles = new Map();
    this.segments = new Map();
  }

  /**
   * Rastreia comportamento do cliente
   */
  async trackBehavior(customerId, behaviorType, data = {}) {
    try {
      const behavior = {
        id: this.generateBehaviorId(),
        customerId,
        type: behaviorType,
        data,
        timestamp: new Date().toISOString(),
        sessionId: data.sessionId || 'unknown'
      };

      // Armazena comportamento
      if (!this.behaviorData.has(customerId)) {
        this.behaviorData.set(customerId, []);
      }
      this.behaviorData.get(customerId).push(behavior);

      // Atualiza perfil do cliente
      await this.updateCustomerProfile(customerId, behavior);

      // Verifica se precisa resegmentar
      await this.checkResegmentation(customerId);

      logger.debug('Comportamento rastreado', { customerId, behaviorType });

      return { success: true, behavior };
    } catch (error) {
      logger.error('Erro ao rastrear comportamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza perfil do cliente
   */
  async updateCustomerProfile(customerId, behavior) {
    const profile = this.customerProfiles.get(customerId) || {
      id: customerId,
      totalPurchases: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      lastPurchase: null,
      favoriteCategories: {},
      purchaseFrequency: 'monthly',
      preferredPaymentMethod: null,
      riskScore: 0,
      lifetimeValue: 0
    };

    switch (behavior.type) {
      case BEHAVIOR_TYPES.PURCHASE:
        profile.totalPurchases++;
        profile.totalSpent += behavior.data.amount || 0;
        profile.averageOrderValue = profile.totalSpent / profile.totalPurchases;
        profile.lastPurchase = behavior.timestamp;
        
        // Atualiza categorias favoritas
        if (behavior.data.category) {
          profile.favoriteCategories[behavior.data.category] = 
            (profile.favoriteCategories[behavior.data.category] || 0) + 1;
        }
        
        // Atualiza método de pagamento preferido
        if (behavior.data.paymentMethod) {
          profile.preferredPaymentMethod = behavior.data.paymentMethod;
        }
        break;

      case BEHAVIOR_TYPES.BROWSE:
        profile.lastBrowse = behavior.timestamp;
        profile.browseCount = (profile.browseCount || 0) + 1;
        break;

      case BEHAVIOR_TYPES.SEARCH:
        profile.lastSearch = behavior.timestamp;
        profile.searchCount = (profile.searchCount || 0) + 1;
        break;

      case BEHAVIOR_TYPES.CART_ABANDON:
        profile.cartAbandonCount = (profile.cartAbandonCount || 0) + 1;
        profile.lastCartAbandon = behavior.timestamp;
        break;
    }

    // Calcula score de risco
    profile.riskScore = this.calculateRiskScore(profile);

    // Calcula lifetime value
    profile.lifetimeValue = this.calculateLifetimeValue(profile);

    this.customerProfiles.set(customerId, profile);
  }

  /**
   * Calcula score de risco
   */
  calculateRiskScore(profile) {
    let score = 0;
    
    // Baseado no tempo desde última compra
    if (profile.lastPurchase) {
      const daysSinceLastPurchase = (Date.now() - new Date(profile.lastPurchase).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPurchase > 90) score += 0.3;
      if (daysSinceLastPurchase > 180) score += 0.4;
    }
    
    // Baseado em abandonos de carrinho
    if (profile.cartAbandonCount > 3) score += 0.2;
    
    // Baseado na frequência de compras
    if (profile.totalPurchases === 0) score += 0.5;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calcula lifetime value
   */
  calculateLifetimeValue(profile) {
    if (profile.totalPurchases === 0) return 0;
    
    const avgOrderValue = profile.averageOrderValue;
    const purchaseFrequency = this.getPurchaseFrequency(profile);
    const customerLifespan = 12; // meses
    
    return avgOrderValue * purchaseFrequency * customerLifespan;
  }

  /**
   * Obtém frequência de compra
   */
  getPurchaseFrequency(profile) {
    if (profile.totalPurchases < 2) return 1;
    
    const firstPurchase = profile.firstPurchase || profile.lastPurchase;
    if (!firstPurchase) return 1;
    
    const monthsSinceFirst = (Date.now() - new Date(firstPurchase).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return profile.totalPurchases / Math.max(monthsSinceFirst, 1);
  }

  /**
   * Verifica se precisa resegmentar
   */
  async checkResegmentation(customerId) {
    const profile = this.customerProfiles.get(customerId);
    if (!profile) return;

    const currentSegment = this.segments.get(customerId);
    const newSegment = this.determineSegment(profile);

    if (currentSegment !== newSegment) {
      this.segments.set(customerId, newSegment);
      
      logger.info('Cliente re-segmentado', { 
        customerId, 
        from: currentSegment, 
        to: newSegment 
      });

      // Dispara ações baseadas no novo segmento
      await this.triggerSegmentActions(customerId, newSegment, profile);
    }
  }

  /**
   * Determina segmento do cliente
   */
  determineSegment(profile) {
    if (profile.totalPurchases >= 10 && profile.averageOrderValue >= 100) {
      return CUSTOMER_SEGMENTS.VIP;
    }
    
    if (profile.riskScore >= 0.7) {
      return CUSTOMER_SEGMENTS.AT_RISK;
    }
    
    if (profile.totalPurchases === 0) {
      return CUSTOMER_SEGMENTS.NEW;
    }
    
    if (profile.riskScore >= 0.9) {
      return CUSTOMER_SEGMENTS.CHURNED;
    }
    
    return CUSTOMER_SEGMENTS.REGULAR;
  }

  /**
   * Dispara ações baseadas no segmento
   */
  async triggerSegmentActions(customerId, segment, profile) {
    switch (segment) {
      case CUSTOMER_SEGMENTS.VIP:
        logger.info('Cliente VIP identificado', { customerId, totalSpent: profile.totalSpent });
        break;
      
      case CUSTOMER_SEGMENTS.AT_RISK:
        logger.warn('Cliente em risco', { customerId, riskScore: profile.riskScore });
        break;
      
      case CUSTOMER_SEGMENTS.CHURNED:
        logger.warn('Cliente churned', { customerId, lastPurchase: profile.lastPurchase });
        break;
    }
  }

  /**
   * Analisa padrões de comportamento
   */
  async analyzeBehaviorPatterns(customerId, period = '30d') {
    try {
      const behaviors = this.behaviorData.get(customerId) || [];
      const periodBehaviors = this.filterByPeriod(behaviors, period);
      
      const patterns = {
        customerId,
        period,
        totalBehaviors: periodBehaviors.length,
        behaviorBreakdown: this.getBehaviorBreakdown(periodBehaviors),
        peakHours: this.getPeakHours(periodBehaviors),
        sessionAnalysis: this.analyzeSessions(periodBehaviors),
        conversionFunnel: this.analyzeConversionFunnel(periodBehaviors),
        recommendations: this.generateBehaviorRecommendations(periodBehaviors)
      };
      
      return { success: true, patterns };
    } catch (error) {
      logger.error('Erro na análise de padrões', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Filtra comportamentos por período
   */
  filterByPeriod(behaviors, period) {
    const periodMs = this.parsePeriod(period);
    const cutoff = Date.now() - periodMs;
    
    return behaviors.filter(b => new Date(b.timestamp).getTime() > cutoff);
  }

  /**
   * Converte período para milissegundos
   */
  parsePeriod(period) {
    const match = period.match(/^(\d+)(d|h|m)$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // 30 dias padrão
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Obtém breakdown de comportamentos
   */
  getBehaviorBreakdown(behaviors) {
    const breakdown = {};
    
    for (const behavior of behaviors) {
      breakdown[behavior.type] = (breakdown[behavior.type] || 0) + 1;
    }
    
    return breakdown;
  }

  /**
   * Obtém horários de pico
   */
  getPeakHours(behaviors) {
    const hourCounts = new Array(24).fill(0);
    
    for (const behavior of behaviors) {
      const hour = new Date(behavior.timestamp).getHours();
      hourCounts[hour]++;
    }
    
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    
    return {
      peakHour,
      distribution: hourCounts
    };
  }

  /**
   * Analisa sessões
   */
  analyzeSessions(behaviors) {
    const sessions = new Map();
    
    for (const behavior of behaviors) {
      const sessionId = behavior.sessionId;
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId).push(behavior);
    }
    
    const sessionDurations = [];
    for (const sessionBehaviors of sessions.values()) {
      if (sessionBehaviors.length > 1) {
        const first = new Date(sessionBehaviors[0].timestamp);
        const last = new Date(sessionBehaviors[sessionBehaviors.length - 1].timestamp);
        sessionDurations.push(last - first);
      }
    }
    
    return {
      totalSessions: sessions.size,
      averageSessionDuration: sessionDurations.length > 0 
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
        : 0,
      behaviorsPerSession: behaviors.length / Math.max(sessions.size, 1)
    };
  }

  /**
   * Analisa funil de conversão
   */
  analyzeConversionFunnel(behaviors) {
    const browseCount = behaviors.filter(b => b.type === BEHAVIOR_TYPES.BROWSE).length;
    const searchCount = behaviors.filter(b => b.type === BEHAVIOR_TYPES.SEARCH).length;
    const cartCount = behaviors.filter(b => b.type === BEHAVIOR_TYPES.PURCHASE).length;
    
    return {
      browseToSearch: browseCount > 0 ? (searchCount / browseCount * 100).toFixed(1) : 0,
      searchToCart: searchCount > 0 ? (cartCount / searchCount * 100).toFixed(1) : 0,
      overallConversion: browseCount > 0 ? (cartCount / browseCount * 100).toFixed(1) : 0
    };
  }

  /**
   * Gera recomendações baseadas em comportamento
   */
  generateBehaviorRecommendations(behaviors) {
    const recommendations = [];
    
    const cartAbandons = behaviors.filter(b => b.type === BEHAVIOR_TYPES.CART_ABANDON).length;
    if (cartAbandons > 2) {
      recommendations.push({
        type: 'reduce_abandonment',
        priority: 'high',
        message: 'Implementar recuperação de carrinho abandonado'
      });
    }
    
    const searches = behaviors.filter(b => b.type === BEHAVIOR_TYPES.SEARCH).length;
    const purchases = behaviors.filter(b => b.type === BEHAVIOR_TYPES.PURCHASE).length;
    if (searches > purchases * 3) {
      recommendations.push({
        type: 'improve_search',
        priority: 'medium',
        message: 'Melhorar resultados de busca para aumentar conversão'
      });
    }
    
    return recommendations;
  }

  /**
   * Obtém segmento do cliente
   */
  async getCustomerSegment(customerId) {
    const segment = this.segments.get(customerId) || CUSTOMER_SEGMENTS.NEW;
    const profile = this.customerProfiles.get(customerId);
    
    return {
      success: true,
      segment,
      profile,
      recommendations: this.getSegmentRecommendations(segment, profile)
    };
  }

  /**
   * Obtém recomendações por segmento
   */
  getSegmentRecommendations(segment, _profile) {
    const recommendations = [];
    
    switch (segment) {
      case CUSTOMER_SEGMENTS.VIP:
        recommendations.push({
          type: 'vip_program',
          message: 'Oferecer programa de fidelidade VIP'
        });
        break;
      
      case CUSTOMER_SEGMENTS.AT_RISK:
        recommendations.push({
          type: 'retention_campaign',
          message: 'Enviar campanha de retenção'
        });
        break;
      
      case CUSTOMER_SEGMENTS.NEW:
        recommendations.push({
          type: 'welcome_campaign',
          message: 'Enviar campanha de boas-vindas'
        });
        break;
    }
    
    return recommendations;
  }

  /**
   * Gera ID único para comportamento
   */
  generateBehaviorId() {
    return `behavior_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas de comportamento
   */
  async getBehaviorStats() {
    try {
      const stats = {
        totalCustomers: this.customerProfiles.size,
        totalBehaviors: Array.from(this.behaviorData.values()).reduce((sum, b) => sum + b.length, 0),
        segmentDistribution: this.getSegmentDistribution(),
        averageLifetimeValue: this.calculateAverageLTV(),
        behaviorBreakdown: this.getOverallBehaviorBreakdown()
      };
      
      return { success: true, stats };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de comportamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém distribuição de segmentos
   */
  getSegmentDistribution() {
    const distribution = {};
    
    for (const segment of this.segments.values()) {
      distribution[segment] = (distribution[segment] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Calcula LTV médio
   */
  calculateAverageLTV() {
    const profiles = Array.from(this.customerProfiles.values());
    if (profiles.length === 0) return 0;
    
    const totalLTV = profiles.reduce((sum, p) => sum + (p.lifetimeValue || 0), 0);
    return totalLTV / profiles.length;
  }

  /**
   * Obtém breakdown geral de comportamentos
   */
  getOverallBehaviorBreakdown() {
    const breakdown = {};
    
    for (const behaviors of this.behaviorData.values()) {
      for (const behavior of behaviors) {
        breakdown[behavior.type] = (breakdown[behavior.type] || 0) + 1;
      }
    }
    
    return breakdown;
  }
}

export const customerBehaviorService = new CustomerBehaviorService();
export { BEHAVIOR_TYPES, CUSTOMER_SEGMENTS };