/**
 * Serviço de Gestão de Fornecedores
 * Gerencia informações e performance de fornecedores
 */

import { logger } from '../../core/utils/logger';
import { cacheService } from './cacheService';
import { Bindings, ExecutionContext } from '../../core/types';

/** Valores de status para fornecedores */
export const SUPPLIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
} as const;

/** Valores de categoria para fornecedores */
export const SUPPLIER_CATEGORIES = {
  RAW_MATERIALS: 'raw_materials',
  PACKAGING: 'packaging',
  EQUIPMENT: 'equipment',
  SERVICES: 'services',
  LOGISTICS: 'logistics'
} as const;

/** Tipo representando valores válidos de status de fornecedor */
export type SupplierStatus = typeof SUPPLIER_STATUS[keyof typeof SUPPLIER_STATUS];
/** Tipo representando valores válidos de categoria de fornecedor */
export type SupplierCategory = typeof SUPPLIER_CATEGORIES[keyof typeof SUPPLIER_CATEGORIES];

/**
 * Métricas de performance de um fornecedor incluindo taxa de entrega, qualidade e tempo de resposta.
 */
export interface SupplierPerformance {
  deliveryRate: number;
  qualityScore: number;
  responseTime: number;
  totalOrders: number;
  onTimeDeliveries: number;
}

/**
 * Representa um fornecedor com informações de contato, status, categoria e dados de performance.
 */
export interface Supplier {
  id: string;
  name: string;
  email?: string;
  cnpj?: string;
  status: SupplierStatus;
  category: SupplierCategory;
  createdAt: Date;
  updatedAt: Date;
  performance: SupplierPerformance;
}

/**
 * Representa um registro de entrega de um fornecedor com dados de qualidade e tempo.
 */
export interface Delivery {
  id: string;
  supplierId: string;
  onTime: boolean;
  qualityScore?: number;
  responseTime?: number;
  deliveredAt: Date;
  [key: string]: any;
}

/**
 * Classe principal do serviço de fornecedores.
 * Gerencia dados de fornecedores, rastreamento de performance e registros de entrega.
 */
export class SupplierService {
  private suppliers = new Map<string, Supplier>();
  private performanceMetrics = new Map<string, any>();
  private contracts = new Map<string, any>();

  constructor() {}

  /**
   * Cria um novo fornecedor com status pendente padrão e métricas de performance vazias.
   * @param supplierData - Dados parciais do fornecedor com nome e categoria obrigatórios
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso e o fornecedor criado ou mensagem de erro
   */
  async createSupplier(supplierData: Partial<Supplier> & { name: string; category: SupplierCategory }, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const supplier: Supplier = {
        id: this.generateSupplierId(),
        name: supplierData.name,
        email: supplierData.email,
        cnpj: supplierData.cnpj,
        category: supplierData.category,
        status: SUPPLIER_STATUS.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        performance: {
          deliveryRate: 100,
          qualityScore: 100,
          responseTime: 0,
          totalOrders: 0,
          onTimeDeliveries: 0
        }
      };

      this.suppliers.set(supplier.id, supplier);
      
      // Cache do fornecedor
      await cacheService.set(`supplier:${supplier.id}`, supplier, 3600, env?.CACHE_KV, ctx);
      
      logger.info('Fornecedor criado', { supplierId: supplier.id, name: supplier.name });
      
      return { success: true, supplier };
    } catch (error: any) {
      logger.error('Erro ao criar fornecedor', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza os dados de um fornecedor existente.
   * @param supplierId - O ID do fornecedor a ser atualizado
   * @param updateData - Dados parciais do fornecedor para atualização
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso e fornecedor atualizado ou mensagem de erro
   */
  async updateSupplier(supplierId: string, updateData: Partial<Supplier>, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const supplier = this.suppliers.get(supplierId);
      if (!supplier) {
        return { success: false, error: 'Fornecedor não encontrado' };
      }

      const updatedSupplier: Supplier = {
        ...supplier,
        ...updateData,
        updatedAt: new Date()
      };

      this.suppliers.set(supplierId, updatedSupplier);
      
      // Atualiza cache
      await cacheService.set(`supplier:${supplierId}`, updatedSupplier, 3600, env?.CACHE_KV, ctx);
      
      logger.info('Fornecedor atualizado', { supplierId });
      
      return { success: true, supplier: updatedSupplier };
    } catch (error: any) {
      logger.error('Erro ao atualizar fornecedor', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recupera um fornecedor pelo ID, verificando primeiro o cache e depois o armazenamento local.
   * @param supplierId - O ID do fornecedor a ser recuperado
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso e dados do fornecedor ou mensagem de erro
   */
  async getSupplier(supplierId: string, env?: Bindings, ctx?: ExecutionContext) {
    try {
      // Tenta cache primeiro
      let supplier: Supplier | null = await cacheService.get(`supplier:${supplierId}`, env?.CACHE_KV, ctx);
      
      if (!supplier) {
        supplier = this.suppliers.get(supplierId) || null;
        if (supplier) {
          await cacheService.set(`supplier:${supplierId}`, supplier, 3600, env?.CACHE_KV, ctx);
        }
      }
      
      if (!supplier) {
        return { success: false, error: 'Fornecedor não encontrado' };
      }
      
      return { success: true, supplier };
    } catch (error: any) {
      logger.error('Erro ao buscar fornecedor', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista fornecedores com filtros e paginação opcionais.
   * @param filters - Filtros opcionais para status, categoria, termo de busca e paginação
   * @returns Status de sucesso com lista paginada de fornecedores e informações de paginação
   */
  async listSuppliers(filters: { status?: SupplierStatus; category?: SupplierCategory; search?: string; page?: number; limit?: number } = {}) {
    try {
      let suppliers = Array.from(this.suppliers.values());
      
      // Aplica filtros
      if (filters.status) {
        suppliers = suppliers.filter(s => s.status === filters.status);
      }
      
      if (filters.category) {
        suppliers = suppliers.filter(s => s.category === filters.category);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        suppliers = suppliers.filter(s => 
          s.name.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower) ||
          s.cnpj?.includes(searchLower)
        );
      }
      
      // Ordena por nome
      suppliers.sort((a, b) => a.name.localeCompare(b.name));
      
      // Paginação
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedSuppliers = suppliers.slice(startIndex, endIndex);
      
      return {
        success: true,
        suppliers: paginatedSuppliers,
        pagination: {
          page,
          limit,
          total: suppliers.length,
          totalPages: Math.ceil(suppliers.length / limit)
        }
      };
    } catch (error: any) {
      logger.error('Erro ao listar fornecedores', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Registra uma entrega de um fornecedor e atualiza suas métricas de performance.
   * @param supplierId - O ID do fornecedor
   * @param deliveryData - Dados da entrega incluindo status onTime e métricas opcionais
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   * @returns Status de sucesso e registro de entrega ou mensagem de erro
   */
  async recordDelivery(supplierId: string, deliveryData: Partial<Delivery> & { onTime: boolean }, env?: Bindings, ctx?: ExecutionContext) {
    try {
      const supplier = this.suppliers.get(supplierId);
      if (!supplier) {
        return { success: false, error: 'Fornecedor não encontrado' };
      }

      const delivery: Delivery = {
        id: this.generateDeliveryId(),
        supplierId,
        qualityScore: deliveryData.qualityScore,
        responseTime: deliveryData.responseTime,
        deliveredAt: new Date(),
        ...deliveryData
      };

      // Atualiza métricas de performance
      await this.updateSupplierPerformance(supplierId, delivery, env, ctx);
      
      // Cache da entrega
      await cacheService.set(`delivery:${delivery.id}`, delivery, 86400, env?.CACHE_KV, ctx);
      
      logger.info('Entrega registrada', { 
        supplierId, 
        deliveryId: delivery.id,
        onTime: delivery.onTime 
      });
      
      return { success: true, delivery };
    } catch (error: any) {
      logger.error('Erro ao registrar entrega', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza métricas de performance do fornecedor baseado em um registro de entrega.
   * Recalcula taxa de entrega, score de qualidade e tempo de resposta.
   * @param supplierId - O ID do fornecedor
   * @param delivery - O registro de entrega com dados de performance
   * @param env - Bindings opcionais do ambiente Cloudflare
   * @param ctx - Contexto de execução opcional
   */
  async updateSupplierPerformance(supplierId: string, delivery: Delivery, env?: Bindings, ctx?: ExecutionContext) {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) return;

    const performance = { ...supplier.performance };
    performance.totalOrders++;
    
    if (delivery.onTime) {
      performance.onTimeDeliveries++;
    }
    
    // Calcula taxa de entrega no prazo
    performance.deliveryRate = (performance.onTimeDeliveries / performance.totalOrders) * 100;
    
    // Atualiza score de qualidade baseado na avaliação
    if (delivery.qualityScore) {
      performance.qualityScore = (
        (performance.qualityScore * (performance.totalOrders - 1) + delivery.qualityScore) / 
        performance.totalOrders
      );
    }
    
    // Atualiza tempo de resposta
    if (delivery.responseTime) {
      performance.responseTime = (
        (performance.responseTime * (performance.totalOrders - 1) + delivery.responseTime) / 
        performance.totalOrders
      );
    }
    
    supplier.performance = performance;
    supplier.updatedAt = new Date();
    
    this.suppliers.set(supplierId, supplier);
    await cacheService.set(`supplier:${supplierId}`, supplier, 3600, env?.CACHE_KV, ctx);
  }

  /**
   * Gera um relatório de performance para fornecedores com filtros opcionais.
   * Inclui estatísticas resumidas e detalhes individuais dos fornecedores com avaliações.
   * @param options - Opções incluindo supplierId opcional e período (padrão: '30d')
   * @returns Status de sucesso e dados do relatório de performance
   */
  async getPerformanceReport(options: { supplierId?: string; period?: string } = {}) {
    try {
      const { supplierId, period = '30d' } = options;
      
      let suppliers = Array.from(this.suppliers.values());
      
      if (supplierId) {
        suppliers = suppliers.filter(s => s.id === supplierId);
      }
      
      const report: any = {
        period,
        generatedAt: new Date().toISOString(),
        summary: {
          totalSuppliers: suppliers.length,
          activeSuppliers: suppliers.filter(s => s.status === SUPPLIER_STATUS.ACTIVE).length,
          averageDeliveryRate: 0,
          averageQualityScore: 0,
          topPerformers: []
        },
        details: []
      };
      
      if (suppliers.length > 0) {
        // Calcula médias
        const totalDeliveryRate = suppliers.reduce((sum, s) => sum + s.performance.deliveryRate, 0);
        const totalQualityScore = suppliers.reduce((sum, s) => sum + s.performance.qualityScore, 0);
        
        report.summary.averageDeliveryRate = totalDeliveryRate / suppliers.length;
        report.summary.averageQualityScore = totalQualityScore / suppliers.length;
        
        // Top performers (maior taxa de entrega)
        report.summary.topPerformers = suppliers
          .sort((a, b) => b.performance.deliveryRate - a.performance.deliveryRate)
          .slice(0, 5)
          .map(s => ({
            id: s.id,
            name: s.name,
            deliveryRate: s.performance.deliveryRate,
            qualityScore: s.performance.qualityScore
          }));
        
        // Detalhes por fornecedor
        report.details = suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          status: supplier.status,
          category: supplier.category,
          performance: supplier.performance,
          rating: this.calculateSupplierRating(supplier.performance)
        }));
      }
      
      return { success: true, report };
    } catch (error: any) {
      logger.error('Erro ao gerar relatório de performance', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calcula uma avaliação em letra (A-F) para um fornecedor baseada nas métricas de performance.
   * Pesos: taxa de entrega 40%, score de qualidade 40%, tempo de resposta 20%.
   * @param performance - As métricas de performance do fornecedor
   * @returns Avaliação em letra de A (melhor) a F (pior)
   */
  calculateSupplierRating(performance: SupplierPerformance) {
    const deliveryWeight = 0.4;
    const qualityWeight = 0.4;
    const responseWeight = 0.2;
    
    // Normaliza tempo de resposta (menor é melhor)
    const responseScore = Math.max(0, 100 - (performance.responseTime / 24));
    
    const rating = (
      performance.deliveryRate * deliveryWeight +
      performance.qualityScore * qualityWeight +
      responseScore * responseWeight
    );
    
    if (rating >= 90) return 'A';
    if (rating >= 80) return 'B';
    if (rating >= 70) return 'C';
    if (rating >= 60) return 'D';
    return 'F';
  }

  /**
   * Gera um ID único para um novo fornecedor.
   * @returns String de ID único do fornecedor
   */
  generateSupplierId() {
    return `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera um ID único para um novo registro de entrega.
   * @returns String de ID único da entrega
   */
  generateDeliveryId() {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Recupera estatísticas agregadas sobre todos os fornecedores.
   * Inclui contagens por status, categoria e métricas médias de performance.
   * @returns Status de sucesso e objeto de estatísticas
   */
  async getStats() {
    try {
      const suppliers = Array.from(this.suppliers.values());
      
      const stats: any = {
        total: suppliers.length,
        byStatus: {},
        byCategory: {},
        performance: {
          averageDeliveryRate: 0,
          averageQualityScore: 0,
          topPerformers: 0
        }
      };
      
      // Contagem por status
      for (const status of Object.values(SUPPLIER_STATUS)) {
        stats.byStatus[status] = suppliers.filter(s => s.status === status).length;
      }
      
      // Contagem por categoria
      for (const category of Object.values(SUPPLIER_CATEGORIES)) {
        stats.byCategory[category] = suppliers.filter(s => s.category === category).length;
      }
      
      // Métricas de performance
      if (suppliers.length > 0) {
        const totalDeliveryRate = suppliers.reduce((sum, s) => sum + s.performance.deliveryRate, 0);
        const totalQualityScore = suppliers.reduce((sum, s) => sum + s.performance.qualityScore, 0);
        
        stats.performance.averageDeliveryRate = totalDeliveryRate / suppliers.length;
        stats.performance.averageQualityScore = totalQualityScore / suppliers.length;
        stats.performance.topPerformers = suppliers.filter(s => 
          s.performance.deliveryRate >= 90 && s.performance.qualityScore >= 90
        ).length;
      }
      
      return { success: true, stats };
    } catch (error: any) {
      logger.error('Erro ao obter estatísticas de fornecedores', error as Error);
      return { success: false, error: error.message };
    }
  }
}

export const supplierService = new SupplierService();
export default SupplierService;
