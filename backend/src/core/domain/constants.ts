export const ROLE_VALUES = ['admin', 'editor', 'customer'] as const;
export type Role = typeof ROLE_VALUES[number];

export const DELIVERY_TYPE_VALUES = ['entrega', 'retirada'] as const;
export type DeliveryType = typeof DELIVERY_TYPE_VALUES[number];

export const ORDER_STATUS_VALUES = [
  'novo',
  'recebido',
  'em_preparo',
  'saiu_entrega',
  'concluido',
  'cancelado',
] as const;
export type OrderStatus = typeof ORDER_STATUS_VALUES[number];

export const PAYMENT_METHOD_VALUES = ['pix', 'maquininha'] as const;
export type PaymentMethod = typeof PAYMENT_METHOD_VALUES[number];

export const PRODUCT_CATEGORY_VALUES = [
  'Óleos Essenciais',
  'Óleos',
  'Chás e Infusões',
  'Naturais',
  'Cosméticos Naturais',
  'Suplementos',
  'Cápsulas',
  'Tinturas',
  'Cremes',
  'Outros',
] as const;
export type ProductCategory = typeof PRODUCT_CATEGORY_VALUES[number];

export const SESSION_COOKIE_NAME = 'lz_session';
export const CSRF_COOKIE_NAME = 'lz_csrf';
export const REFRESH_TOKEN_COOKIE_NAME = 'lz_refresh';
export const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h — sliding window via touchSession
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
export const PASSWORD_SETUP_TTL_HOURS = 48;
export const PASSWORD_SETUP_CODE_LENGTH = 8;

export const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;
export const CATALOG_CACHE_TTL_SECONDS = 300; // 5 minutos
