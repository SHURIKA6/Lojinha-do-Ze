/**
 * Serviço de Previsão de Demanda Baseada em Histórico
 * Implementa algoritmos de previsão para estoque e produção
 */

import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';

/**
 * Algoritmos de previsão disponíveis
 */
const FORECAST_ALGORITHMS = {
  MOVING_AVERAGE: 'moving_average',
  EXPONENTIAL_SMOOTHING: 'exponential_smoothing',
  LINEAR_REGRESSION: 'linear_regression',
  SEASONAL_DECOMPOSITION: 'seasonal_decomposition'
};

/**
 * Períodos de sazonalidade
 */
const SEASONALITY_PERIODS = {
  DAILY: 7,      // Semanal
  WEEKLY: 52,    // Anual
  MONTHLY: 12    // Anual
};

class DemandForecastService {
  constructor() {
    this.historicalData = new Map();
    this.predictions = new Map();
  }

  /**
   * Carrega dados históricos para um produto
   */
  async loadHistoricalData(productId, days = 365) {
    try {
      const cacheKey = `historical:${productId}:${days}`;
      let data = cacheService.get(cacheKey);
      
      if (!data) {
        // Simula dados históricos - em produção viria do banco
        data = this.generateMockHistoricalData(productId, days);
        cacheService.set(cacheKey, data, 3600); // 1 hora
      }
      
      this.historicalData.set(productId, data);
      return { success: true, data };
    } catch (error) {
      logger.error('Erro ao carregar dados históricos', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera dados históricos simulados
   */
  generateMockHistoricalData(productId, days) {
    const data = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - days);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      
      // Simula padrão de vendas com sazonalidade
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      
      let baseSales = 10 + Math.random() * 5;
      
      // Fim de semana vende mais
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseSales *= 1.3;
      }
      
      // Dezembro vende mais
      if (month === 11) {
        baseSales *= 1.5;
      }
      
      // Janeiro vende menos
      if (month === 0) {
        baseSales *= 0.8;
      }
      
      data.push({
        date: date.toISOString().split('T')[0],
        sales: Math.round(baseSales),
        stock: Math.floor(Math.random() * 100) + 20,
        price: 10 + Math.random() * 20
      });
    }
    
    return data;
  }

  /**
   * Calcula previsão usando média móvel
   */
  calculateMovingAverage(data, windowSize = 7) {
    if (data.length < windowSize) {
      return { error: 'Dados insuficientes para média móvel' };
    }
    
    const recentData = data.slice(-windowSize);
    const sum = recentData.reduce((acc, item) => acc + item.sales, 0);
    const average = sum / windowSize;
    
    return {
      prediction: Math.round(average),
      confidence: 0.7,
      algorithm: 'moving_average',
      windowSize
    };
  }

  /**
   * Calcula previsão usando suavização exponencial
   */
  calculateExponentialSmoothing(data, alpha = 0.3) {
    if (data.length < 2) {
      return { error: 'Dados insuficientes para suavização exponencial' };
    }
    
    let forecast = data[0].sales;
    
    for (let i = 1; i < data.length; i++) {
      forecast = alpha * data[i].sales + (1 - alpha) * forecast;
    }
    
    return {
      prediction: Math.round(forecast),
      confidence: 0.75,
      algorithm: 'exponential_smoothing',
      alpha
    };
  }

  /**
   * Calcula previsão usando regressão linear
   */
  calculateLinearRegression(data) {
    if (data.length < 2) {
      return { error: 'Dados insuficientes para regressão linear' };
    }
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].sales;
      sumXY += i * data[i].sales;
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const prediction = slope * n + intercept;
    
    return {
      prediction: Math.round(prediction),
      confidence: 0.8,
      algorithm: 'linear_regression',
      slope,
      intercept
    };
  }

  /**
   * Detecta sazonalidade nos dados
   */
  detectSeasonality(data) {
    if (data.length < 14) {
      return { hasSeasonality: false, period: null };
    }
    
    // Análise simples de sazonalidade semanal
    const weeklyPattern = new Array(7).fill(0);
    const weeklyCount = new Array(7).fill(0);
    
    for (const item of data) {
      const dayOfWeek = new Date(item.date).getDay();
      weeklyPattern[dayOfWeek] += item.sales;
      weeklyCount[dayOfWeek]++;
    }
    
    // Calcula média por dia da semana
    for (let i = 0; i < 7; i++) {
      if (weeklyCount[i] > 0) {
        weeklyPattern[i] /= weeklyCount[i];
      }
    }
    
    // Verifica se há padrão significativo
    const avgSales = weeklyPattern.reduce((a, b) => a + b, 0) / 7;
    const variance = weeklyPattern.reduce((acc, val) => acc + Math.pow(val - avgSales, 2), 0) / 7;
    const stdDev = Math.sqrt(variance);
    
    const hasSeasonality = stdDev > avgSales * 0.1; // 10% de variação
    
    return {
      hasSeasonality,
      period: hasSeasonality ? 'weekly' : null,
      pattern: hasSeasonality ? weeklyPattern : null,
      strength: hasSeasonality ? stdDev / avgSales : 0
    };
  }

  /**
   * Gera previsão de demanda
   */
  async generateForecast(productId, daysAhead = 30, algorithm = 'moving_average') {
    try {
      // Carrega dados históricos se necessário
      if (!this.historicalData.has(productId)) {
        await this.loadHistoricalData(productId);
      }
      
      const data = this.historicalData.get(productId);
      if (!data || data.length === 0) {
        return { success: false, error: 'Dados históricos não encontrados' };
      }
      
      let prediction;
      
      switch (algorithm) {
        case FORECAST_ALGORITHMS.MOVING_AVERAGE:
          prediction = this.calculateMovingAverage(data);
          break;
        case FORECAST_ALGORITHMS.EXPONENTIAL_SMOOTHING:
          prediction = this.calculateExponentialSmoothing(data);
          break;
        case FORECAST_ALGORITHMS.LINEAR_REGRESSION:
          prediction = this.calculateLinearRegression(data);
          break;
        default:
          prediction = this.calculateMovingAverage(data);
      }
      
      if (prediction.error) {
        return { success: false, error: prediction.error };
      }
      
      // Detecta sazonalidade
      const seasonality = this.detectSeasonality(data);
      
      // Ajusta previsão com sazonalidade
      if (seasonality.hasSeasonality) {
        const dayOfWeek = new Date();
        dayOfWeek.setDate(dayOfWeek.getDate() + daysAhead);
        const dayIndex = dayOfWeek.getDay();
        
        if (seasonality.pattern && seasonality.pattern[dayIndex]) {
          const seasonalFactor = seasonality.pattern[dayIndex] / 
            (seasonality.pattern.reduce((a, b) => a + b, 0) / 7);
          prediction.prediction = Math.round(prediction.prediction * seasonalFactor);
        }
      }
      
      // Calcula intervalo de confiança
      const confidenceInterval = {
        lower: Math.round(prediction.prediction * 0.8),
        upper: Math.round(prediction.prediction * 1.2)
      };
      
      const forecast = {
        productId,
        algorithm: prediction.algorithm,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        confidenceInterval,
        seasonality,
        daysAhead,
        generatedAt: new Date().toISOString()
      };
      
      // Cache da previsão
      const cacheKey = `forecast:${productId}:${daysAhead}:${algorithm}`;
      cacheService.set(cacheKey, forecast, 1800); // 30 minutos
      
      this.predictions.set(productId, forecast);
      
      logger.info('Previsão de demanda gerada', { 
        productId, 
        prediction: forecast.prediction,
        algorithm: forecast.algorithm 
      });
      
      return { success: true, forecast };
    } catch (error) {
      logger.error('Erro ao gerar previsão de demanda', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera previsões para múltiplos produtos
   */
  async generateBatchForecasts(productIds, daysAhead = 30, algorithm = 'moving_average') {
    try {
      const forecasts = [];
      
      for (const productId of productIds) {
        const result = await this.generateForecast(productId, daysAhead, algorithm);
        if (result.success) {
          forecasts.push(result.forecast);
        }
      }
      
      return { success: true, forecasts };
    } catch (error) {
      logger.error('Erro ao gerar previsões em lote', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém previsão de estoque recomendado
   */
  async getStockRecommendation(productId, currentStock, leadTimeDays = 7) {
    try {
      const forecast = await this.generateForecast(productId, leadTimeDays);
      
      if (!forecast.success) {
        return { success: false, error: forecast.error };
      }
      
      const predictedDemand = forecast.forecast.prediction;
      const safetyStock = Math.round(predictedDemand * 0.2); // 20% de segurança
      
      const recommendedStock = predictedDemand + safetyStock;
      const needsReorder = currentStock < recommendedStock;
      const reorderQuantity = needsReorder ? recommendedStock - currentStock : 0;
      
      return {
        success: true,
        recommendation: {
          currentStock,
          predictedDemand,
          safetyStock,
          recommendedStock,
          needsReorder,
          reorderQuantity,
          leadTimeDays,
          forecast: forecast.forecast
        }
      };
    } catch (error) {
      logger.error('Erro ao calcular recomendação de estoque', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém estatísticas de previsão
   */
  async getForecastStats() {
    try {
      const stats = {
        totalPredictions: this.predictions.size,
        algorithmsUsed: {},
        averageConfidence: 0,
        cacheHits: 0
      };
      
      let totalConfidence = 0;
      
      for (const forecast of this.predictions.values()) {
        stats.algorithmsUsed[forecast.algorithm] = 
          (stats.algorithmsUsed[forecast.algorithm] || 0) + 1;
        totalConfidence += forecast.confidence;
      }
      
      if (stats.totalPredictions > 0) {
        stats.averageConfidence = totalConfidence / stats.totalPredictions;
      }
      
      return { success: true, stats };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de previsão', error);
      return { success: false, error: error.message };
    }
  }
}

export const demandForecastService = new DemandForecastService();
export { FORECAST_ALGORITHMS, SEASONALITY_PERIODS };