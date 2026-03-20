export const ROLE_VALUES = ['admin', 'editor', 'customer'];

export const DELIVERY_TYPE_VALUES = ['entrega', 'retirada'];

export const ORDER_STATUS_VALUES = [
  'novo',
  'recebido',
  'em_preparo',
  'saiu_entrega',
  'concluido',
  'cancelado',
];

export const PAYMENT_METHOD_VALUES = ['pix', 'maquininha'];

export const PRODUCT_CATEGORY_VALUES = [
  'Óleos Essenciais',
  'Chás e Infusões',
  'Naturais',
  'Cosméticos Naturais',
  'Suplementos',
  'Cápsulas',
  'Tinturas',
  'Cremes',
  'Outros',
];

export const SESSION_COOKIE_NAME = 'lz_session';
export const CSRF_COOKIE_NAME = 'lz_csrf';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const PASSWORD_SETUP_TTL_HOURS = 48;
export const PASSWORD_SETUP_CODE_LENGTH = 8;

export const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;
export const CATALOG_CACHE_TTL_SECONDS = 300; // 5 minutos

