/**
 * Serviço de Monitoramento de Performance
 * Coleta métricas de performance e gera alertas
 */

import { logger } from '../utils/logger';
import { cacheService } from './cacheService';

/**
 * Métricas de performance
 */
export const PERFORMANCE_METRICS = {
  RESPONSE_TIME: 'response_time',
  DATABASE_QUERY: 'database_query',
  CACHE_HIT_RATE: 'cache_hit_rate',
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage',
  ERROR_RATE: 'error_rate',
  THROUGHPUT: 'throughput',
  CONCURRENT_USERS: 'concurrent_users'
} as const;

/**
 * Limites de performance
 */
export const PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME: {
    GOOD: 100,      // < 100ms
    ACCEPTABLE: 500, // < 500ms
    SLOW: 1000,     // < 1s
    CRITICAL: 5000  // > 5s
  },
  DATABASE_QUERY: {
    GOOD: 50,       // < 50ms
    ACCEPTABLE: 200, // < 200ms
    SLOW: 1000,     // < 1s
    CRITICAL: 5000  // > 5s
  },
  CACHE_HIT_RATE: {
    GOOD: 80,       // > 80%
    ACCEPTABLE: 60, // > 60%
    POOR: 40,       // > 40%
    CRITICAL: 20    // < 20%
  },
  ERROR_RATE: {
    GOOD: 1,        // < 1%
    ACCEPTABLE: 5,  // < 5%
    HIGH: 10,       // < 10%
    CRITICAL: 20    // > 20%
  }
} as const;

export interface PerformanceMeasurement {
  requestId: string;
  operation: string;
  startTime: number;
  startMemory: NodeJS.MemoryUsage;
  checkpoints: PerformanceCheckpoint[];
}

export interface PerformanceCheckpoint {
  name: string;
  timestamp: number;
  duration: number;
  memory: NodeJS.MemoryUsage;
  data: any;
}

export interface PerformanceResult {
  requestId: string;
  operation: string;
  duration: number;
  success: boolean;
  memoryDelta: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  checkpoints: PerformanceCheckpoint[];
  timestamp: string;
}

export interface PerformanceAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  data: any;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

/**
 * Classe principal do serviço de monitoramento
 */
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMeasurement>();
  private alerts = new Map<string, PerformanceAlert>();
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private startTime = Date.now();

  constructor() {}

  /**
   * Inicia medição de performance para uma requisição
   */
  startMeasurement(requestId: string, operation: string): PerformanceMeasurement {
    const measurement: PerformanceMeasurement = {
      requestId,
      operation,
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      checkpoints: []
    };

    this.metrics.set(requestId, measurement);
    return measurement;
  }

  /**
   * Adiciona checkpoint de performance
   */
  addCheckpoint(requestId: string, checkpointName: string, data: any = {}) {
    const measurement = this.metrics.get(requestId);
    if (!measurement) return;

    measurement.checkpoints.push({
      name: checkpointName,
      timestamp: Date.now(),
      duration: Date.now() - measurement.startTime,
      memory: process.memoryUsage(),
      data
    });
  }

  /**
   * Finaliza medição de performance
   */
  endMeasurement(requestId: string, success = true): PerformanceResult | null {
    const measurement = this.metrics.get(requestId);
    if (!measurement) return null;

    const endTime = Date.now();
    const duration = endTime - measurement.startTime;
    const endMemory = process.memoryUsage();

    const result: PerformanceResult = {
      requestId: measurement.requestId,
      operation: measurement.operation,
      duration,
      success,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - measurement.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - measurement.startMemory.heapTotal,
        external: endMemory.external - measurement.startMemory.external
      },
      checkpoints: measurement.checkpoints,
      timestamp: new Date().toISOString()
    };

    // Atualiza estatísticas globais
    this.requestCount++;
    this.totalResponseTime += duration;
    if (!success) this.errorCount++;

    // Verifica limites e gera alertas
    this.checkThresholds(result);

    // Remove medição da memória
    this.metrics.delete(requestId);

    return result;
  }

  /**
   * Verifica limites de performance
   */
  checkThresholds(measurement: PerformanceResult) {
    const { duration, operation } = measurement;

    // Verifica tempo de resposta
    if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.CRITICAL) {
      this.createAlert('CRITICAL', 'response_time', {
        operation,
        duration,
        threshold: PERFORMANCE_THRESHOLDS.RESPONSE_TIME.CRITICAL
      });
    } else if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.SLOW) {
      this.createAlert('WARNING', 'response_time', {
        operation,
        duration,
        threshold: PERFORMANCE_THRESHOLDS.RESPONSE_TIME.SLOW
      });
    }

    // Verifica checkpoints de banco de dados
    const dbCheckpoints = measurement.checkpoints.filter(cp => 
      cp.name.includes('database') || cp.name.includes('query')
    );

    for (const checkpoint of dbCheckpoints) {
      if (checkpoint.duration > PERFORMANCE_THRESHOLDS.DATABASE_QUERY.CRITICAL) {
        this.createAlert('CRITICAL', 'database_query', {
          operation,
          query: checkpoint.name,
          duration: checkpoint.duration,
          threshold: PERFORMANCE_THRESHOLDS.DATABASE_QUERY.CRITICAL
        });
      }
    }
  }

  /**
   * Cria alerta de performance
   */
  createAlert(severity: 'CRITICAL' | 'WARNING' | 'INFO', type: string, data: any) {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      type,
      data,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);

    // Log do alerta
    logger.warn(`Alerta de Performance: ${severity} - ${type}`, {
      alertId: alert.id,
      ...data
    });

    // Armazena no cache para dashboard
    const alertKey = `performance_alerts:${type}`;
    const existingAlerts: PerformanceAlert[] = cacheService.get(alertKey) || [];
    existingAlerts.unshift(alert);
    
    // Mantém apenas os últimos 100 alertas por tipo
    if (existingAlerts.length > 100) {
      existingAlerts.splice(100);
    }
    
    cacheService.set(alertKey, existingAlerts, 86400); // 24 horas

    return alert;
  }

  /**
   * Obtém estatísticas de performance
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestCount > 0 
      ? this.totalResponseTime / this.requestCount 
      : 0;

    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;

    return {
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000)
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        successRate: this.requestCount > 0 
          ? ((this.requestCount - this.errorCount) / this.requestCount) * 100 
          : 100,
        errorRate: errorRate.toFixed(2)
      },
      responseTime: {
        average: avgResponseTime.toFixed(2),
        total: this.totalResponseTime
      },
      memory: process.memoryUsage(),
      activeMeasurements: this.metrics.size,
      alerts: {
        total: this.alerts.size,
        unacknowledged: Array.from(this.alerts.values()).filter(a => !a.acknowledged).length
      }
    };
  }

  /**
   * Obtém métricas de cache
   */
  getCacheMetrics() {
    const cacheStats = cacheService.getMetrics();
    const hitRate = parseFloat(cacheStats.hitRate) || 0;

    let status = 'GOOD';
    if (hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.CRITICAL) {
      status = 'CRITICAL';
    } else if (hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.POOR) {
      status = 'POOR';
    } else if (hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.ACCEPTABLE) {
      status = 'ACCEPTABLE';
    }

    return {
      ...cacheStats,
      status,
      thresholds: PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE
    };
  }

  /**
   * Obtém alertas de performance
   */
  getAlerts(options: { type?: string; severity?: string; limit?: number; acknowledged?: boolean } = {}) {
    const { type, severity, limit = 50, acknowledged } = options;
    
    let alerts = Array.from(this.alerts.values());

    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === acknowledged);
    }

    // Ordena por timestamp (mais recente primeiro)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return alerts.slice(0, limit);
  }

  /**
   * Marca alerta como reconhecido
   */
  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Limpa alertas antigos
   */
  cleanupOldAlerts(maxAgeHours = 168) { // 7 dias
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).getTime();
    
    for (const [key, alert] of this.alerts.entries()) {
      if (new Date(alert.timestamp).getTime() < cutoffTime) {
        this.alerts.delete(key);
      }
    }
  }

  /**
   * Gera relatório de performance
   */
  generateReport(period = '24h') {
    const stats = this.getStats();
    const cacheMetrics = this.getCacheMetrics();
    const recentAlerts = this.getAlerts({ limit: 10 });

    const report = {
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        status: this.getOverallStatus(stats, cacheMetrics),
        uptime: stats.uptime,
        totalRequests: stats.requests.total,
        successRate: stats.requests.successRate,
        averageResponseTime: stats.responseTime.average,
        cacheHitRate: cacheMetrics.hitRate,
        activeAlerts: stats.alerts.unacknowledged
      },
      details: {
        performance: stats,
        cache: cacheMetrics,
        alerts: recentAlerts
      },
      recommendations: this.generateRecommendations(stats, cacheMetrics)
    };

    return report;
  }

  /**
   * Determina status geral do sistema
   */
  getOverallStatus(stats: any, cacheMetrics: any) {
    const errorRate = parseFloat(stats.requests.errorRate);
    const avgResponseTime = parseFloat(stats.responseTime.average);
    const cacheHitRate = parseFloat(cacheMetrics.hitRate);

    if (errorRate > PERFORMANCE_THRESHOLDS.ERROR_RATE.CRITICAL ||
        avgResponseTime > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.CRITICAL ||
        cacheHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.CRITICAL) {
      return 'CRITICAL';
    }

    if (errorRate > PERFORMANCE_THRESHOLDS.ERROR_RATE.HIGH ||
        avgResponseTime > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.SLOW ||
        cacheHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.POOR) {
      return 'WARNING';
    }

    if (errorRate > PERFORMANCE_THRESHOLDS.ERROR_RATE.ACCEPTABLE ||
        avgResponseTime > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.ACCEPTABLE ||
        cacheHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.ACCEPTABLE) {
      return 'ACCEPTABLE';
    }

    return 'GOOD';
  }

  /**
   * Gera recomendações de melhoria
   */
  generateRecommendations(stats: any, cacheMetrics: any) {
    const recommendations: any[] = [];
    const errorRate = parseFloat(stats.requests.errorRate);
    const avgResponseTime = parseFloat(stats.responseTime.average);
    const cacheHitRate = parseFloat(cacheMetrics.hitRate);

    if (errorRate > PERFORMANCE_THRESHOLDS.ERROR_RATE.ACCEPTABLE) {
      recommendations.push({
        type: 'error_rate',
        priority: 'HIGH',
        message: `Taxa de erro elevada (${errorRate.toFixed(2)}%). Investigar logs de erro.`,
        action: 'Analisar logs de erro e identificar padrões'
      });
    }

    if (avgResponseTime > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.ACCEPTABLE) {
      recommendations.push({
        type: 'response_time',
        priority: 'MEDIUM',
        message: `Tempo de resposta médio elevado (${avgResponseTime.toFixed(2)}ms).`,
        action: 'Otimizar consultas de banco e cache'
      });
    }

    if (cacheHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE.ACCEPTABLE) {
      recommendations.push({
        type: 'cache_performance',
        priority: 'MEDIUM',
        message: `Taxa de hit do cache baixa (${cacheHitRate}%).`,
        action: 'Revisar estratégia de cache e TTLs'
      });
    }

    if (stats.alerts.unacknowledged > 10) {
      recommendations.push({
        type: 'alert_management',
        priority: 'LOW',
        message: `${stats.alerts.unacknowledged} alertas não reconhecidos.`,
        action: 'Reconhecer e resolver alertas pendentes'
      });
    }

    return recommendations;
  }
}

// Instância singleton
export const performanceMonitor = new PerformanceMonitor();

// Exporta constantes para uso externo
export default PerformanceMonitor;
