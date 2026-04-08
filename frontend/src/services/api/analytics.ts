import { request } from './client';

export function getDemandForecast() {
  return request('/analytics/forecast');
}

export function getReviewSentiment() {
  return request('/analytics/bi/sentiment');
}
