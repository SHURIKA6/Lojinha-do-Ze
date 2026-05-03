/**
 * Valores válidos de papéis para autorização de usuários na aplicação.
 * Usado para validar e tipar papéis de usuário em toda a lógica de autenticação e controle de acesso.
 */
export const ROLE_VALUES = ['admin', 'editor', 'customer'] as const;
/**
 * Tipo que representa papéis válidos de usuário, derivado de {@link ROLE_VALUES}.
 */
export type Role = typeof ROLE_VALUES[number];

/**
 * Opções válidas de tipos de entrega para pedidos.
 * Usado para validar seleções de método de entrega durante o checkout e processamento de pedidos.
 */
export const DELIVERY_TYPE_VALUES = ['entrega', 'retirada'] as const;
/**
 * Tipo que representa tipos de entrega válidos, derivado de {@link DELIVERY_TYPE_VALUES}.
 */
export type DeliveryType = typeof DELIVERY_TYPE_VALUES[number];

/**
 * Valores válidos de status para rastreamento do ciclo de vida do pedido.
 * Usado para validar e atualizar status de pedidos durante todo o processo de fulfilliment.
 */
export const ORDER_STATUS_VALUES = [
  'novo',
  'recebido',
  'em_preparo',
  'saiu_entrega',
  'concluido',
  'cancelado',
] as const;
/**
 * Tipo que representa status válidos de pedidos, derivado de {@link ORDER_STATUS_VALUES}.
 */
export type OrderStatus = typeof ORDER_STATUS_VALUES[number];

/**
 * Opções válidas de métodos de pagamento para checkout de pedidos.
 * Usado para validar métodos de pagamento selecionados durante a criação do pedido.
 */
export const PAYMENT_METHOD_VALUES = ['pix', 'maquininha'] as const;
/**
 * Tipo que representa métodos de pagamento válidos, derivado de {@link PAYMENT_METHOD_VALUES}.
 */
export type PaymentMethod = typeof PAYMENT_METHOD_VALUES[number];

/**
 * Opções válidas de categorias de produtos para organização do catálogo.
 * Usado para validar e categorizar produtos no catálogo e inventário.
 */
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
/**
 * Tipo que representa categorias válidas de produtos, derivado de {@link PRODUCT_CATEGORY_VALUES}.
 */
export type ProductCategory = typeof PRODUCT_CATEGORY_VALUES[number];

/**
 * Nome do cookie de sessão usado para sessões de autenticação de usuários.
 * Armazenado no cliente para manter o estado de login ativo do usuário.
 */
export const SESSION_COOKIE_NAME = 'lz_session';
/**
 * Nome do cookie de proteção CSRF para prevenção de falsificação de requisições cross-site.
 * Usado para validar que as requisições originam do frontend da aplicação.
 */
export const CSRF_COOKIE_NAME = 'lz_csrf';
/**
 * Nome do cookie de refresh token para geração de novos tokens de sessão.
 * Usado para emitir novos tokens de sessão quando o atual expira.
 */
export const REFRESH_TOKEN_COOKIE_NAME = 'lz_refresh';
/**
 * TTL (time-to-live) para tokens de sessão em segundos (24 horas).
 * Utiliza uma janela deslizante via `touchSession` para estender o TTL em atividades do usuário.
 */
export const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h — sliding window via touchSession
/**
 * TTL para refresh tokens em segundos (7 dias).
 * Usado para gerar novos tokens de sessão quando a sessão atual expira.
 */
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
/**
 * TTL para links/códigos de configuração de senha em horas.
 * Após este período, a solicitação de configuração de senha expira e uma nova deve ser gerada.
 */
export const PASSWORD_SETUP_TTL_HOURS = 48;
/**
 * Comprimento dos códigos de configuração de senha gerados automaticamente enviados aos usuários via email.
 */
export const PASSWORD_SETUP_CODE_LENGTH = 8;

/**
 * Conjunto de métodos HTTP que não modificam o estado do servidor.
 * Estes métodos estão isentos de verificações de proteção CSRF pois não causam efeitos colaterais.
 */
export const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/**
 * Número padrão de itens por página para respostas paginadas da API.
 * Usado quando o cliente não especifica um tamanho de página personalizado.
 */
export const DEFAULT_PAGE_SIZE = 12;
/**
 * Número máximo permitido de itens por página para respostas paginadas da API.
 * Evita recuperação excessiva de dados e degradação de performance.
 */
export const MAX_PAGE_SIZE = 100;
/**
 * TTL para dados de catálogo de produtos em cache em segundos (5 minutos).
 * Reduz a carga do banco de dados para requisições frequentes de listagem do catálogo.
 */
export const CATALOG_CACHE_TTL_SECONDS = 300; // 5 minutos
