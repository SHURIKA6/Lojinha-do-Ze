/**
 * Prefixos e chaves de cache centralizados.
 * Evita strings mágicas espalhadas pelo código e facilita invalidação em massa.
 */

/**
 * Prefixos utilizados para namespacing de chaves no cache.
 * Cada prefixo identifica um domínio específico para facilitar invalidação seletiva.
 * 
 * @constant
 * @type {Readonly<{CATALOG: string, DASHBOARD: string, REPORTS: string, USER_PROFILE: string}>}
 */
export const CACHE_PREFIXES = {
  CATALOG: 'catalog_',
  DASHBOARD: 'dashboard_',
  REPORTS: 'report_',
  USER_PROFILE: 'profile_',
} as const;

/**
 * Tempos de expiração (TTL) para cada categoria de cache em segundos.
 * Define por quanto tempo os dados devem permanecer em cache antes de serem invalidados.
 * 
 * @constant
 * @type {Readonly<{CATALOG: number, DASHBOARD: number, REPORTS: number, USER_PROFILE: number}>}
 */
export const CACHE_TTL = {
  CATALOG: 300,      // 5 minutos
  DASHBOARD: 60,     // 1 minuto
  REPORTS: 120,      // 2 minutos
  USER_PROFILE: 300, // 5 minutos
} as const;
