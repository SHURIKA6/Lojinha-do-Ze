/**
 * Prefixos e chaves de cache centralizados.
 * Evita strings mágicas espalhadas pelo código e facilita invalidação em massa.
 */

export const CACHE_PREFIXES = {
  CATALOG: 'catalog_',
  DASHBOARD: 'dashboard_',
  REPORTS: 'report_',
  USER_PROFILE: 'profile_',
} as const;

export const CACHE_TTL = {
  CATALOG: 300,      // 5 minutos
  DASHBOARD: 60,     // 1 minuto
  REPORTS: 120,      // 2 minutos
  USER_PROFILE: 300, // 5 minutos
} as const;
