/**
 * Serviço de Análise de Comportamento do Cliente
 * Rastreia e analisa padrões de comportamento dos clientes
 * 
 * Este módulo implementa customer analytics para entender o comportamento
 * de compra, navegação e engajamento dos clientes, permitindo segmentação
 * e personalização de ofertas baseadas em dados reais.
 */

import { logger } from '../../core/utils/logger';
import { Bindings, ExecutionContext } from '../../core/types';

/**
 * Tipos de comportamento rastreáveis no sistema
 * 
 * @property {string} PURCHASE - Compra realizada
 * @property {string} BROWSE - Navegação/visualização de produtos
 * @property {string} SEARCH - Busca por produtos
 * @property {string} CART_ABANDON - Abandono de carrinho
 * @property {string} WISHLIST - Adição à lista de desejos
 * @property {string} REVIEW - Avaliação de produtos
 */
export const BEHAVIOR_TYPES = {
  PURCHASE: 'purchase',
  BROWSE: 'browse',
  SEARCH: 'search',
  CART_ABANDON: 'cart_abandon',
  WISHLIST: 'wishlist',
  REVIEW: 'review'
} as const;

/**
 * Segmentos de clientes para estratégias de marketing
 * 
 * @property {string} VIP - Clientes premium com alto valor e frequência
 * @property {string} REGULAR - Clientes com comportamento de compra padrão
 * @property {string} NEW - Novos clientes ainda em avaliação
 * @property {string} AT_RISK - Clientes com risco de cancelamento/churn
 * @property {string} CHURNED - Clientes que já abandonaram a plataforma
 */
export const CUSTOMER_SEGMENTS = {
  VIP: 'vip',
  REGULAR: 'regular',
  NEW: 'new',
  AT_RISK: 'at_risk',
  CHURNED: 'churned'
} as const;

/**
 * Tipo que representa os tipos de comportamento disponíveis
 */
export type BehaviorType = typeof BEHAVIOR_TYPES[keyof typeof BEHAVIOR_TYPES];

/**
 * Tipo que representa os segmentos de clientes disponíveis
 */
export type CustomerSegment = typeof CUSTOMER_SEGMENTS[keyof typeof CUSTOMER_SEGMENTS];

/**
 * Dados de comportamento de um cliente
 * 
 * @interface BehaviorData
 * @property {string} id - ID único do evento de comportamento
 * @property {number} customerId - ID do cliente
 * @property {BehaviorType} type - Tipo do comportamento registrado
 * @property {any} data - Dados adicionais do evento (ex: amount, category)
 * @property {string} timestamp - Timestamp ISO do evento
 * @property {string} sessionId - ID da sessão do usuário
 */
export interface BehaviorData {
  id: string;
  customerId: number;
  type: BehaviorType;
  data: any;
  timestamp: string;
  sessionId: string;
}

/**
 * Perfil completo de um cliente baseado em seu comportamento
 * 
 * @interface CustomerProfile
 * @property {number} id - ID do cliente
 * @property {number} totalPurchases - Total de compras realizadas
 * @property {number} totalSpent - Valor total gasto pelo cliente
 * @property {number} averageOrderValue - Valor médio por pedido
 * @property {string | null} lastPurchase - Data da última compra
 * @property {Record<string, number>} favoriteCategories - Categorias preferidas com contagem
 * @property {string} purchaseFrequency - Frequência de compras ('monthly', etc)
 * @property {string | null} preferredPaymentMethod - Método de pagamento preferido
 * @property {number} riskScore - Score de risco de churn (0 a 1)
 * @property {number} lifetimeValue - Valor do cliente ao longo do tempo
 * @property {string} [lastBrowse] - Data da última navegação
 * @property {number} [browseCount] - Contagem de navegações
 * @property {string} [lastSearch] - Data da última busca
 * @property {number} [searchCount] - Contagem de buscas
 * @property {number} [cartAbandonCount] - Contagem de abandonos de carrinho
 * @property {string} [lastCartAbandon] - Data do último abandono
 * @property {string} [firstPurchase] - Data da primeira compra
 */
export interface CustomerProfile {
  id: number;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchase: string | null;
  favoriteCategories: Record<string, number>;
  purchaseFrequency: string;
  preferredPaymentMethod: string | null;
  riskScore: number;
  lifetimeValue: number;
  lastBrowse?: string;
  browseCount?: number;
  lastSearch?: string;
  searchCount?: number;
  cartAbandonCount?: number;
  lastCartAbandon?: string;
  firstPurchase?: string;
}

/**
 * Serviço principal para análise de comportamento do cliente
 * 
 * Esta classe gerencia o rastreamento, perfilamento e segmentação de clientes.
 * Permite entender padrões de consumo e identificar oportunidades de marketing.
 * 
 * @class CustomerBehaviorService
 * @example
 * const service = new CustomerBehaviorService();
 * await service.trackBehavior(123, 'purchase', { amount: 100, category: 'eletronicos' });
 */
export class CustomerBehaviorService {
  private behaviorData = new Map<number, BehaviorData[]>();
  private customerProfiles = new Map<number, CustomerProfile>();
  private segments = new Map<number, CustomerSegment>();

  constructor() {}

  /**
   * Rastreia um comportamento do cliente
   * 
   * Registra eventos de comportamento, atualiza o perfil do cliente,
   * verifica necessidade de resegmentação e persiste no KV store se disponível.
   * 
   * @param {number} customerId - ID do cliente
   * @param {BehaviorType} behaviorType - Tipo de comportamento ocorrido
   * @param {any} data - Dados adicionais do evento (amount, category, etc)
   * @param {Bindings} env - Variáveis de ambiente com ANALYTICS_KV
   * @param {ExecutionContext} ctx - Contexto de execução
   * @returns {Promise<{success: boolean, behavior?: BehaviorData, error?: string}>}
   *          Comportamento registrado ou erro
   */
  async trackBehavior(customerId: number, behaviorType: BehaviorType, data: any = {}, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const behavior: BehaviorData = {
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
      this.behaviorData.get(customerId)?.push(behavior);

      // Atualiza perfil do cliente
      await this.updateCustomerProfile(customerId, behavior);

      // Verifica se precisa resegmentar
      await this.checkResegmentation(customerId);

      // Persistência em KV se disponível
      const kv = env?.ANALYTICS_KV;
      if (kv) {
        const kvKey = `behavior:${customerId}:${behavior.id}`;
        const putOp = async () => {
          try {
            await kv.put(kvKey, JSON.stringify(behavior), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 dias
          } catch (e) {
            logger.error(`Erro ao persistir comportamento no KV: ${kvKey}`, e as Error);
          }
        };

        if (ctx?.waitUntil) {
          ctx.waitUntil(putOp());
        } else {
          putOp().catch(err => logger.error(`Erro assíncrono no KV behavior: ${kvKey}`, err));
        }
      }

      logger.debug('Comportamento rastreado', { customerId, behaviorType });

      return { success: true, behavior };
    } catch (error: any) {
      logger.error('Erro ao rastrear comportamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza perfil do cliente baseado em novo comportamento
   * 
   * Atualiza métricas como total de compras, valor gasto, categorias favoritas
   * e recalcula score de risco e lifetime value.
   * 
   * @param {number} customerId - ID do cliente
   * @param {BehaviorData} behavior - Dados do comportamento ocorrido
   */
  async updateCustomerProfile(customerId: number, behavior: BehaviorData) {
    const profile: CustomerProfile = this.customerProfiles.get(customerId) || {
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
   * Calcula score de risco de churn do cliente
   * 
   * Avalia probabilidade do cliente abandonar a plataforma baseado em:
   * tempo desde última compra, abandonos de carrinho e histórico de compras.
   * Score varia de 0 (sem risco) a 1 (risco máximo).
   * 
   * @param {CustomerProfile} profile - Perfil do cliente para avaliação
   * @returns {number} Score de risco entre 0 e 1
   */
  calculateRiskScore(profile: CustomerProfile) {
    let score = 0;
    
    // Baseado no tempo desde última compra
    if (profile.lastPurchase) {
      const daysSinceLastPurchase = (Date.now() - new Date(profile.lastPurchase).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPurchase > 90) score += 0.3;
      if (daysSinceLastPurchase > 180) score += 0.4;
    }
    
    // Baseado em abandonos de carrinho
    if (profile.cartAbandonCount && profile.cartAbandonCount > 3) score += 0.2;
    
    // Baseado na frequência de compras
    if (profile.totalPurchases === 0) score += 0.5;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calcula o Lifetime Value (LTV) do cliente
   * 
   * O LTV representa o valor total que um cliente gera ao longo de sua
   * relação com a empresa. Calculado como: valor médio * frequência * tempo.
   * 
   * @param {CustomerProfile} profile - Perfil do cliente
   * @returns {number} Valor do Lifetime Value
   */
  calculateLifetimeValue(profile: CustomerProfile) {
    if (profile.totalPurchases === 0) return 0;
    
    const avgOrderValue = profile.averageOrderValue;
    const purchaseFrequency = this.getPurchaseFrequency(profile);
    const customerLifespan = 12; // meses
    
    return avgOrderValue * purchaseFrequency * customerLifespan;
  }

  /**
   * Obtém frequência de compra do cliente (compras por mês)
   * 
   * Calcula a média de compras mensais baseada no histórico desde
   * a primeira compra registrada.
   * 
   * @param {CustomerProfile} profile - Perfil do cliente
   * @returns {number} Frequência de compras por mês
   */
  getPurchaseFrequency(profile: CustomerProfile) {
    if (profile.totalPurchases < 2) return 1;
    
    const firstPurchase = profile.firstPurchase || profile.lastPurchase;
    if (!firstPurchase) return 1;
    
    const monthsSinceFirst = (Date.now() - new Date(firstPurchase).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return profile.totalPurchases / Math.max(monthsSinceFirst, 1);
  }

  /**
   * Verifica se o cliente precisa ser resegmentado
   * 
   * Compara o segmento atual com o novo segmento calculado.
   * Se houver mudança, atualiza o segmento e dispara ações apropriadas.
   * 
   * @param {number} customerId - ID do cliente
   */
  async checkResegmentation(customerId: number) {
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
   * Determina o segmento do cliente baseado no perfil
   * 
   * Aplica regras de negócio para classificar o cliente:
   * VIP (10+ compras, ticket >= 100), AT_RISK (score >= 0.7),
   * NEW (0 compras), CHURNED (score >= 0.9) ou REGULAR.
   * 
   * @param {CustomerProfile} profile - Perfil do cliente
   * @returns {CustomerSegment} Segmento determinado
   */
  determineSegment(profile: CustomerProfile): CustomerSegment {
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
   * Dispara ações baseadas no segmento do cliente
   * 
   * Executa ações de marketing ou operações específicas quando um cliente
   * entra em um novo segmento (ex: alerta VIP, campanha de retenção).
   * 
   * @param {number} customerId - ID do cliente
   * @param {CustomerSegment} segment - Novo segmento do cliente
   * @param {CustomerProfile} profile - Perfil do cliente
   */
  async triggerSegmentActions(customerId: number, segment: CustomerSegment, profile: CustomerProfile) {
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
   * Analisa padrões de comportamento de um cliente em um período
   * 
   * Gera análise completa incluindo breakdown de comportamentos,
   * horários de pico, análise de sessões e funil de conversão.
   * 
   * @param {number} customerId - ID do cliente
   * @param {string} period - Período de análise (ex: '30d', '7d', '24h')
   * @param {any} env - Variáveis de ambiente
   * @param {any} ctx - Contexto de execução
   * @returns {Promise<{success: boolean, patterns?: Object, error?: string}>}
   *          Padrões identificados ou erro
   */
  async analyzeBehaviorPatterns(customerId: number, period = '30d', env?: any, ctx?: any) {
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
    } catch (error: any) {
      logger.error('Erro na análise de padrões', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Filtra comportamentos por período
   * 
   * @param {BehaviorData[]} behaviors - Lista de comportamentos
   * @param {string} period - Período em formato (ex: '30d')
   * @returns {BehaviorData[]} Comportamentos dentro do período
   */
  filterByPeriod(behaviors: BehaviorData[], period: string) {
    const periodMs = this.parsePeriod(period);
    const cutoff = Date.now() - periodMs;
    
    return behaviors.filter(b => new Date(b.timestamp).getTime() > cutoff);
  }

  /**
   * Converte período em string para milissegundos
   * 
   * @param {string} period - Período em formato (ex: '30d', '12h', '45m')
   * @returns {number} Período em milissegundos
   */
  parsePeriod(period: string) {
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
   * Obtém breakdown de comportamentos (contagem por tipo)
   * 
   * @param {BehaviorData[]} behaviors - Lista de comportamentos
   * @returns {Record<string, number>} Mapa com contagem por tipo
   */
  getBehaviorBreakdown(behaviors: BehaviorData[]) {
    const breakdown: Record<string, number> = {};
    
    for (const behavior of behaviors) {
      breakdown[behavior.type] = (breakdown[behavior.type] || 0) + 1;
    }
    
    return breakdown;
  }

  /**
   * Obtém horários de pico de atividade do cliente
   * 
   * Analisa os comportamentos e identifica em quais horas do dia
   * o cliente é mais ativo.
   * 
   * @param {BehaviorData[]} behaviors - Lista de comportamentos
   * @returns {{peakHour: number, distribution: number[]}} Hora do pico e distribuição 24h
   */
  getPeakHours(behaviors: BehaviorData[]) {
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
   * Analisa sessões de usuário (agrupa comportamentos por sessionId)
   * 
   * Calcula métricas como duração média de sessão e
   * comportamentos por sessão.
   * 
   * @param {BehaviorData[]} behaviors - Lista de comportamentos
   * @returns {{totalSessions: number, averageSessionDuration: number, behaviorsPerSession: number}}
   *          Métricas de sessão
   */
  analyzeSessions(behaviors: BehaviorData[]) {
    const sessions = new Map<string, BehaviorData[]>();
    
    for (const behavior of behaviors) {
      const sessionId = behavior.sessionId;
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)?.push(behavior);
    }
    
    const sessionDurations: number[] = [];
    for (const sessionBehaviors of sessions.values()) {
      if (sessionBehaviors.length > 1) {
        const first = new Date(sessionBehaviors[0].timestamp).getTime();
        const last = new Date(sessionBehaviors[sessionBehaviors.length - 1].timestamp).getTime();
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
   * Analisa funil de conversão (Browse -> Search -> Purchase)
   * 
   * Calcula taxas de conversão entre estágios do funil de vendas
   * para identificar gargalos na jornada do cliente.
   * 
   * @param {BehaviorData[]} behaviors - Lista de comportamentos
   * @returns {{browseToSearch: string, searchToCart: string, overallConversion: string}}
   *          Taxas de conversão em porcentagem
   */
  analyzeConversionFunnel(behaviors: BehaviorData[]) {
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
   * 
   * Analisa padrões para sugerir ações de melhoria como
   * redução de abandono de carrinho ou melhoria em busca.
   * 
   * @param {BehaviorData[]} behaviors - Lista de comportamentos
   * @returns {Array<{type: string, priority: string, message: string}>} Recomendações
   */
  generateBehaviorRecommendations(behaviors: BehaviorData[]) {
    const recommendations: any[] = [];
    
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
   * Obtém segmento atual do cliente
   * 
   * Retorna o segmento, perfil e recomendações específicas
   * para o segmento do cliente.
   * 
   * @param {number} customerId - ID do cliente
   * @returns {Promise<{success: boolean, segment: CustomerSegment, profile?: CustomerProfile, recommendations: any[]}>}
   *          Segmento e dados relacionados
   */
  async getCustomerSegment(customerId: number) {
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
   * Obtém recomendações baseadas no segmento
   * 
   * Retorna ações de marketing sugeridas para cada tipo de segmento
   * (ex: programa VIP, campanha de retenção, boas-vindas).
   * 
   * @param {CustomerSegment} segment - Segmento do cliente
   * @param {CustomerProfile | undefined} _profile - Perfil do cliente (não utilizado)
   * @returns {Array<{type: string, message: string}>} Recomendações
   */
  getSegmentRecommendations(segment: CustomerSegment, _profile: CustomerProfile | undefined) {
    const recommendations: any[] = [];
    
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
   * 
   * Cria identificador único baseado em timestamp e string aleatória.
   * 
   * @returns {string} ID único do comportamento
   */
  generateBehaviorId() {
    return `behavior_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas de comportamento do sistema
   * 
   * Retorna métricas agregadas como total de clientes, comportamentos,
   * distribuição de segmentos e LTV médio.
   * 
   * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
   *          Estatísticas ou erro
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
    } catch (error: any) {
      logger.error('Erro ao obter estatísticas de comportamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém distribuição de segmentos de clientes
   * 
   * @returns {Record<string, number>} Mapa com contagem por segmento
   */
  getSegmentDistribution() {
    const distribution: Record<string, number> = {};
    
    for (const segment of this.segments.values()) {
      distribution[segment] = (distribution[segment] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Calcula LTV médio de todos os clientes
   * 
   * @returns {number} Lifetime Value médio
   */
  calculateAverageLTV() {
    const profiles = Array.from(this.customerProfiles.values());
    if (profiles.length === 0) return 0;
    
    const totalLTV = profiles.reduce((sum, p) => sum + (p.lifetimeValue || 0), 0);
    return totalLTV / profiles.length;
  }

  /**
   * Obtém breakdown geral de comportamentos de todos os clientes
   * 
   * @returns {Record<string, number>} Mapa com contagem total por tipo
   */
  getOverallBehaviorBreakdown() {
    const breakdown: Record<string, number> = {};
    
    for (const behaviors of this.behaviorData.values()) {
      for (const behavior of behaviors) {
        breakdown[behavior.type] = (breakdown[behavior.type] || 0) + 1;
      }
    }
    
    return breakdown;
  }
}

/**
 * Instância singleton do serviço de comportamento do cliente
 * Recomendada para uso em toda a aplicação
 */
export const customerBehaviorService = new CustomerBehaviorService();

/**
 * Export default da classe CustomerBehaviorService
 * Permite importação para instanciamento próprio se necessário
 */
export default CustomerBehaviorService;
