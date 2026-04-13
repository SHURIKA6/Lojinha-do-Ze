import { request } from './client';

export interface Forecast {
  id: string | number;
  name: string;
  currentStock: number;
  movingAverage: number;
  regression: number;
  seasonality: boolean;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  text: string;
  score: number;
}

export interface ForecastResponse {
  forecasts: Forecast[];
}

export interface SentimentResponse {
  sentimentAnalysis: SentimentAnalysis[];
}

export async function getDemandForecast(): Promise<ForecastResponse> {
  return request<ForecastResponse>('/panel-metrics/forecast');
}

export async function getReviewSentiment(): Promise<SentimentResponse> {
  return request<SentimentResponse>('/panel-metrics/bi/sentiment');
}
