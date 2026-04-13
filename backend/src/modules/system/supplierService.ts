/**
 * Serviço de Gestão de Fornecedores
 * Gerencia informações e performance de fornecedores
 */

import { logger } from '../../core/utils/logger';
import { cacheService } from './cacheService';

/**
 * Status de fornecedores
 */
export const SUPPLIER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
} as const;

/**
 * Categorias de fornecedores
 */
export const SUPPLIER_CATEGORIES = {
  RAW_MATERIALS: 'raw_materials',
  PACKAGING: 'packaging',
  EQUIPMENT: 'equipment',
  SERVICES: 'services',
  LOGISTICS: 'logistics'
} as const;

export type SupplierStatus = typeof SUPPLIER_STATUS[keyof typeof SUPPLIER_STATUS];
export type SupplierCategory = typeof SUPPLIER_CATEGORIES[keyof typeof SUPPLIER_CATEGORIES];

export interface SupplierPerformance {
  deliveryRate: number;
  qualityScore: number;
  responseTime: number;
  totalOrders: number;
  onTimeDeliveries: number;
}

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
 * Classe principal do serviço de fornecedores
 */
export class SupplierService {
  private suppliers = new Map<string, Supplier>();
  private performanceMetrics = new Map<string, any>();
  private contracts = new Map<string, any>();

  constructor() {}

  /**
   * Cria um novo fornecedor
   */
  async createSupplier(supplierData: Partial<Supplier> & { name: string; category: SupplierCategory }) {
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
      cacheService.set(`supplier:${supplier.id}`, supplier, 3600);
      
      logger.info('Fornecedor criado', { supplierId: supplier.id, name: supplier.name });
      
      return { success: true, supplier };
    } catch (error: any) {
      logger.error('Erro ao criar fornecedor', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza um fornecedor
   */
  async updateSupplier(supplierId: string, updateData: Partial<Supplier>) {
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
      cacheService.set(`supplier:${supplierId}`, updatedSupplier, 3600);
      
      logger.info('Fornecedor atualizado', { supplierId });
      
      return { success: true, supplier: updatedSupplier };
    } catch (error: any) {
      logger.error('Erro ao atualizar fornecedor', error as Error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém fornecedor por ID
   */
  async getSupplier(supplierId: string) {
    try {
      // Tenta cache primeiro
      let supplier: Supplier | null = cacheService.get(`supplier:${supplierId}`);
      
      if (!supplier) {
        supplier = this.suppliers.get(supplierId) || null;
        if (supplier) {
          cacheService.set(`supplier:${supplierId}`, supplier, 3600);
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
   * Lista fornecedores com filtros
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
   * Registra entrega de fornecedor
   */
  async recordDelivery(supplierId: string, deliveryData: Partial<Delivery> & { onTime: boolean }) {
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
      await this.updateSupplierPerformance(supplierId, delivery);
      
      // Cache da entrega
      cacheService.set(`delivery:${delivery.id}`, delivery, 86400);
      
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
   * Atualiza métricas de performance do fornecedor
   */
  async updateSupplierPerformance(supplierId: string, delivery: Delivery) {
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
    cacheService.set(`supplier:${supplierId}`, supplier, 3600);
  }

  /**
   * Obtém relatório de performance de fornecedores
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
   * Calcula rating do fornecedor
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
   * Gera ID único para fornecedor
   */
  generateSupplierId() {
    return `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera ID único para entrega
   */
  generateDeliveryId() {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas de fornecedores
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
