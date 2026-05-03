// ============================================
// Types Index - Lojinha do Zé
// ============================================

import { QueryResult, QueryResultRow } from '@neondatabase/serverless';

// Tipos de Usuário e Autenticação

/**
 * Representa um usuário no sistema com informações de perfil e acesso baseado em função.
 */
export interface User {
  /** Identificador único do usuário */
  id: string;
  /** Endereço de e-mail do usuário, usado para login e comunicação */
  email: string;
  /** Nome completo do usuário */
  name: string;
  /** CPF (Cadastro de Pessoas Físicas) */
  cpf: string;
  /** Número de telefone do usuário (opcional) */
  phone?: string;
  /** Endereço físico do usuário (opcional) */
  address?: Address;
  /** URL ou caminho para a imagem de avatar do usuário (opcional) */
  avatar?: string;
  /** Função do usuário no sistema - admin com acesso total ou customer */
  role: 'admin' | 'customer';
  /** Data e hora em que a conta do usuário foi criada */
  createdAt: Date;
  /** Data e hora da última atualização da conta do usuário */
  updatedAt: Date;
}

/**
 * Representa um registro de usuário conforme armazenado no banco de dados com campos de autenticação.
 * Contém campos adicionais como hash de senha e rastreamento de tentativas de login.
 */
export interface UserDB {
  /** Identificador único do usuário */
  id: string;
  /** Endereço de e-mail do usuário */
  email: string;
  /** Senha com hash para autenticação (nulo para usuários de login social) */
  password: string | null;
  /** Nome completo do usuário */
  name: string;
  /** CPF (Cadastro de Pessoas Físicas) */
  cpf: string;
  /** Número de telefone do usuário (opcional) */
  phone: string | null;
  /** Endereço físico do usuário em formato JSON ou string (opcional) */
  address: string | null;
  /** URL ou caminho para a imagem de avatar do usuário (opcional) */
  avatar: string | null;
  /** Função do usuário no sistema */
  role: string;
  /** Data e hora em que a conta do usuário foi criada */
  created_at: Date;
  /** Data e hora da última atualização da conta do usuário */
  updated_at: Date | null;
  /** Número de tentativas de login falhadas para proteção de bloqueio de conta */
  login_attempts: number;
  /** Data e hora até quando a conta está bloqueada após muitas tentativas falhadas (opcional) */
  locked_until: string | null;
}

/**
 * Representa um registro de cliente conforme armazenado no banco de dados.
 * Clientes podem ter menos campos obrigatórios comparado a contas completas de usuário.
 */
export interface CustomerDB {
  /** Identificador único do cliente */
  id: string;
  /** Nome completo do cliente */
  name: string;
  /** Endereço de e-mail do cliente (opcional) */
  email: string | null;
  /** Número de telefone do cliente (opcional) */
  phone: string | null;
  /** CPF do cliente (opcional) */
  cpf: string | null;
  /** Endereço físico do cliente (opcional) */
  address: string | null;
  /** Notas adicionais sobre o cliente (opcional) */
  notes: string | null;
  /** URL ou caminho para a imagem de avatar do cliente (opcional) */
  avatar: string | null;
  /** Função do cliente no sistema */
  role: string;
  /** Data e hora em que o registro do cliente foi criado */
  created_at: Date;
  /** Data e hora da última atualização do registro do cliente */
  updated_at: Date;
}

/**
 * Dados necessários para criar um novo cliente no sistema.
 */
export interface CustomerCreateData {
  /** Nome completo do cliente */
  name: string;
  /** Endereço de e-mail do cliente (opcional) */
  email: string | null;
  /** Número de telefone do cliente (opcional) */
  phone: string | null;
  /** CPF do cliente (opcional) */
  cpf: string | null;
  /** Endereço físico do cliente (opcional) */
  address: string | null;
  /** Notas adicionais sobre o cliente (opcional) */
  notes: string | null;
  /** URL ou caminho para a imagem de avatar do cliente */
  avatar: string;
}

/**
 * Dados para atualizar as informações de um cliente existente.
 * Todos os campos são opcionais pois apenas os campos fornecidos serão atualizados.
 */
export interface CustomerUpdateData {
  /** Nome completo do cliente (opcional) */
  name?: string;
  /** Endereço de e-mail do cliente (opcional) */
  email?: string | null;
  /** Número de telefone do cliente (opcional) */
  phone?: string | null;
  /** CPF do cliente (opcional) */
  cpf?: string | null;
  /** Endereço físico do cliente (opcional) */
  address?: string | null;
  /** Notas adicionais sobre o cliente (opcional) */
  notes?: string | null;
  /** URL ou caminho para a imagem de avatar do cliente (opcional) */
  avatar?: string;
}

/**
 * Contém tokens de acesso e atualização para sessões de usuário autenticados.
 */
export interface AuthTokens {
  /** Token de acesso JWT para autenticar requisições à API */
  accessToken: string;
  /** Token usado para obter um novo token de acesso quando o atual expirar */
  refreshToken: string;
}

// Tipos de Produto

/**
 * Representa um produto disponível para venda na loja.
 */
export interface Product {
  /** Identificador único do produto */
  id: string;
  /** Nome de exibição do produto */
  name: string;
  /** Descrição detalhada do produto */
  description: string;
  /** Preço atual do produto na moeda da loja */
  price: number;
  /** Número de unidades atualmente disponíveis no estoque */
  stock: number;
  /** Identificador ou nome da categoria do produto */
  category: string;
  /** Array de URLs ou caminhos das imagens do produto */
  images: string[];
  /** Se o produto está atualmente disponível para compra */
  active: boolean;
  /** Data e hora em que o produto foi adicionado ao catálogo */
  createdAt: Date;
  /** Data e hora da última atualização das informações do produto */
  updatedAt: Date;
}

/**
 * Representa uma categoria de produto para organizar produtos na loja.
 */
export interface ProductCategory {
  /** Identificador único da categoria */
  id: string;
  /** Nome de exibição da categoria */
  name: string;
  /** Slug amigável para URLs da categoria */
  slug: string;
}

// Tipos de Pedido

/**
 * Representa um pedido do cliente contendo itens, totais e informações de status.
 */
export interface Order {
  /** Identificador único do pedido */
  id: string;
  /** ID do usuário que fez o pedido */
  userId: string;
  /** Array de itens incluídos neste pedido */
  items: OrderItem[];
  /** Valor total do pedido incluindo todos os itens */
  total: number;
  /** Status atual do pedido no processo de fulfillment */
  status: OrderStatus;
  /** Status do pagamento atual do pedido */
  paymentStatus: PaymentStatus;
  /** Endereço de entrega onde o pedido será entregue */
  shippingAddress: Address;
  /** Data e hora em que o pedido foi criado */
  createdAt: Date;
  /** Data e hora da última atualização do pedido */
  updatedAt: Date;
}

/**
 * Representa um único item dentro de um pedido, contendo detalhes do produto e quantidade.
 */
export interface OrderItem {
  /** ID do produto sendo pedido */
  productId: string;
  /** Nome do produto no momento do pedido (para precisão histórica) */
  productName: string;
  /** Número de unidades deste produto no pedido */
  quantity: number;
  /** Preço por unidade do produto no momento do pedido */
  price: number;
}

/**
 * Possíveis status para um pedido ao longo de seu ciclo de vida.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

/**
 * Possíveis status de pagamento para um pedido.
 */
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

// Tipos de Endereço

/**
 * Representa um endereço físico para usuários, clientes e entrega de pedidos.
 */
export interface Address {
  /** Nome da rua */
  street: string;
  /** Número do prédio ou casa */
  number: string;
  /** Informações adicionais de endereço como número de apartamento (opcional) */
  complement?: string;
  /** Bairro ou distrito */
  neighborhood: string;
  /** Nome da cidade */
  city: string;
  /** Estado ou província */
  state: string;
  /** CEP ou código postal */
  zipCode: string;
}

// Tipos de Pagamento

/**
 * Representa uma transação de pagamento para um pedido.
 */
export interface Payment {
  /** Identificador único do pagamento */
  id: string;
  /** ID do pedido ao qual este pagamento está associado */
  orderId: string;
  /** Método de pagamento usado para esta transação */
  method: PaymentMethod;
  /** Valor total do pagamento */
  amount: number;
  /** Status atual do pagamento */
  status: PaymentStatus;
  /** ID da transação no MercadoPago para rastreamento externo de pagamento (opcional) */
  mercadoPagoId?: string;
  /** Data e hora em que o pagamento foi criado */
  createdAt: Date;
}

/**
 * Métodos de pagamento disponíveis para processar pedidos.
 */
export type PaymentMethod = 'pix' | 'credit_card' | 'bank_slip';

// Tipos de Fornecedor

/**
 * Representa um fornecedor ou vendedor que fornece produtos para a loja.
 */
export interface Supplier {
  /** Identificador único do fornecedor */
  id: string;
  /** Nome da empresa ou contato do fornecedor */
  name: string;
  /** Endereço de e-mail do fornecedor para comunicação */
  email: string;
  /** Número de telefone do fornecedor */
  phone: string;
  /** Endereço físico do fornecedor */
  address: Address;
  /** Se o fornecedor está atualmente ativo e disponível para pedidos */
  active: boolean;
  /** Data e hora em que o fornecedor foi adicionado ao sistema */
  createdAt: Date;
}

// Tipos de Notificação

/**
 * Representa uma notificação enviada a um usuário sobre vários eventos no sistema.
 */
export interface Notification {
  /** Identificador único da notificação */
  id: string;
  /** ID do usuário que deve receber esta notificação */
  userId: string;
  /** Tipo de notificação que determina sua categoria e tratamento */
  type: NotificationType;
  /** Título breve ou assunto da notificação */
  title: string;
  /** Conteúdo detalhado da mensagem da notificação */
  message: string;
  /** Se o usuário já leu esta notificação */
  read: boolean;
  /** Data e hora em que a notificação foi criada */
  createdAt: Date;
}

/**
 * Tipos de notificações que podem ser enviadas aos usuários.
 */
export type NotificationType = 'order' | 'payment' | 'stock' | 'system';

// Tipos de Analytics

/**
 * Métricas representando o desempenho de vendas durante um período específico.
 */
export interface SalesMetrics {
  /** Receita total de vendas no período */
  totalSales: number;
  /** Número total de pedidos no período */
  totalOrders: number;
  /** Valor médio dos pedidos no período */
  averageOrderValue: number;
  /** Período de tempo para o qual estas métricas são calculadas (ex: 'daily', 'monthly') */
  period: string;
}

/**
 * Métricas representando o status atual do estoque em todos os produtos.
 */
export interface StockMetrics {
  /** Número total de produtos ativos no estoque */
  totalProducts: number;
  /** Número de produtos com estoque abaixo do limite mínimo */
  lowStockProducts: number;
  /** Número de produtos com estoque zero */
  outOfStockProducts: number;
}

// Tipos de Cache

/**
 * Configurações de configuração para o sistema de cache da aplicação.
 */
export interface CacheConfig {
  /** Tempo de vida em segundos para itens em cache */
  ttl: number;
  /** Prefixo adicionado a todas as chaves de cache para isolamento de namespace */
  prefix: string;
}

// Tipos de Resposta da API

/**
 * Wrapper padrão de resposta da API para todos os endpoints.
 * @template T - O tipo de dados retornado em caso de sucesso
 */
export interface ApiResponse<T = unknown> {
  /** Se a requisição da API foi bem-sucedida */
  success: boolean;
  /** Dados de resposta retornados quando a requisição é bem-sucedida (opcional) */
  data?: T;
  /** Mensagem de erro retornada quando a requisição falha (opcional) */
  error?: string;
  /** Mensagem adicional legível sobre a resposta (opcional) */
  message?: string;
}

/**
 * Resposta paginada da API estendendo a resposta padrão com metadados de paginação.
 * @template T - O tipo de itens no array de dados paginados
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Metadados de paginação para navegar pelos resultados */
  pagination: {
    /** Número da página atual (indexado em 1) */
    page: number;
    /** Número máximo de itens por página */
    limit: number;
    /** Número total de itens em todas as páginas */
    total: number;
    /** Número total de páginas disponíveis */
    totalPages: number;
  };
}

// Tipos de Validação

/**
 * Representa um erro de validação para um campo específico em uma requisição.
 */
export interface ValidationError {
  /** O nome do campo que falhou na validação */
  field: string;
  /** Descrição do que aconteceu de errado com o campo */
  message: string;
}

// Tipos de Rate Limit

/**
 * Configuração para limitação de taxa para prevenir abuso de endpoints da API.
 */
export interface RateLimitConfig {
  /** Janela de tempo em milissegundos durante a qual as requisições são contadas */
  windowMs: number;
  /** Número máximo de requisições permitidas dentro da janela de tempo */
  maxRequests: number;
}

/**
 * Estrutura de dados para analisar indicadores potenciais de fraude em pagamentos.
 */
export interface PaymentFraudData {
  /** Identificador único do pagamento sendo analisado */
  id: string;
  /** Valor do pagamento sendo analisado */
  amount: number;
  /** Número de tentativas de pagamento (números altos podem indicar fraude) */
  attempts: number;
  /** Informações de localização geográfica para o pagamento (opcional) */
  location?: {
    /** Código ou nome do país onde o pagamento se originou */
    country: string;
  };
}

/**
 * Saída de modelo de predição para necessidades futuras de estoque baseadas em dados históricos.
 */
export interface StockPrediction {
  /** Demanda prevista para o produto */
  demand: number;
  /** Nível de confiança da predição (0-1 ou porcentagem) */
  confidence: number;
  /** Fatores sazonais afetando a predição */
  seasonality: {
    /** Fator multiplicador representando mudança de demanda sazonal */
    factor: number;
    /** Descrição do padrão sazonal (ex: 'holiday', 'summer') */
    pattern: string;
  };
}

/**
 * Resultados de análise para uma avaliação de cliente incluindo sentimento e palavras-chave.
 */
export interface ReviewAnalysis {
  /** Identificador único da avaliação */
  reviewId: number;
  /** Conteúdo de texto completo da avaliação */
  text: string;
  /** Pontuação de sentimento indicando sentimento positivo/negativo (-1 a 1 ou escala similar) */
  sentiment: number;
  /** Array de tópicos principais ou palavras extraídas da avaliação */
  keywords: string[];
  /** Data e hora em que a avaliação foi enviada */
  timestamp: string;
}

/**
 * Dados históricos de vendas para um produto específico usados em análise de tendências.
 */
export interface HistoricalSalesData {
  /** Identificador único do produto */
  productId: number;
  /** Array de pontos de dados de vendas com datas e quantidades */
  sales: Array<{ date: string; quantity: number }>;
  /** Número médio calculado de unidades vendidas por dia */
  averageDailySales: number;
  /** Direção da tendência geral de vendas para este produto */
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Tipos de Requisição

/**
 * Interface de requisição estendida que inclui informações do usuário autenticado.
 */
export interface RequestWithUser {
  /** Objeto do usuário autenticado (opcional se não autenticado) */
  user?: User;
}

// Tipos de Banco de Dados

/**
 * Interface de banco de dados abstraindo operações de banco para a aplicação.
 */
export interface Database {
  /**
   * Executa uma consulta SQL com parâmetros opcionais.
   * @template T - O tipo de linhas esperadas no resultado
   * @param text - String de consulta SQL
   * @param params - Array opcional de parâmetros de consulta
   * @returns Promise que resolve para o resultado da consulta
   */
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  /**
   * Estabelece uma conexão com o banco de dados.
   * @returns Promise que resolve quando conectado
   */
  connect(): Promise<any>;
  /**
   * Fecha a conexão com o banco de dados.
   * @returns Promise que resolve quando desconectado
   */
  close(): Promise<void>;
}

/**
 * Configurações de configuração para conexão com o banco de dados.
 */
export interface DatabaseConfig {
  /** String de conexão para o banco de dados (ex: URI de conexão PostgreSQL) */
  connectionString: string;
  /** Número máximo de conexões simultâneas no pool (opcional) */
  maxConnections?: number;
}

// Tipos do Hono

/**
 * Bindings de ambiente para deploy no Cloudflare Workers/Hono.
 */
export type Bindings = {
  /** URL de conexão com o banco de dados PostgreSQL */
  DATABASE_URL: string;
  /** Ambiente de deploy atual (ex: 'production', 'development') */
  ENVIRONMENT: string;
  /** URL da aplicação frontend para CORS e redirecionamentos (opcional) */
  FRONTEND_URL?: string;
  /** Lista separada por vírgula de origens CORS permitidas (opcional) */
  ALLOWED_ORIGINS?: string;
  /** Configuração de confiança de proxy (opcional) */
  TRUST_PROXY?: string;
  /** Chave secreta para assinar tokens JWT (opcional) */
  JWT_SECRET?: string;
  /** Chave pública VAPID para notificações push web (opcional) */
  NEXT_PUBLIC_VAPID_KEY?: string;
  /** Tipo de integração com API do WhatsApp a usar (opcional) */
  WHATSAPP_API_TYPE?: 'official' | 'evolution';
  /** URL do endpoint da API do WhatsApp (opcional) */
  WHATSAPP_API_URL?: string;
  /** Chave de API para autenticar com a API do WhatsApp (opcional) */
  WHATSAPP_API_KEY?: string;
  /** Nome da instância para conexão com a API do WhatsApp (opcional) */
  WHATSAPP_INSTANCE_NAME?: string;
  /** ID do telefone para API oficial do WhatsApp Business (opcional) */
  WHATSAPP_PHONE_ID?: string;
  /** Token de acesso para API oficial do WhatsApp Business (opcional) */
  WHATSAPP_ACCESS_TOKEN?: string;
  /** Número de telefone principal do Zé (opcional) */
  ZE_PHONE_1?: string;
  /** Número de telefone secundário do Zé (opcional) */
  ZE_PHONE_2?: string;
  /** Número de telefone da Shura (opcional) */
  SHURA_PHONE?: string;
  /** Namespace KV do Cloudflare para cache */
  CACHE_KV: KVNamespace;
  /** Namespace KV do Cloudflare para dados de analytics (opcional) */
  ANALYTICS_KV?: KVNamespace;
  /** Permite variáveis de ambiente adicionais */
  [key: string]: any;
};

/**
 * Variáveis armazenadas no contexto do Hono para tratamento de requisições.
 */
export type Variables = {
  /** Instância do banco de dados para a requisição atual */
  db: Database;
  /** Usuário autenticado para a requisição atual (opcional) */
  user?: User | null;
  /** Informações de sessão (opcional) */
  session?: any;
  /** Sessão resolvida após autenticação (opcional) */
  resolvedSession?: any;
  /** Permite variáveis de contexto adicionais */
  [key: string]: any;
};

/**
 * Contexto de execução do Cloudflare Workers para gerenciar tarefas assíncronas.
 */
export interface ExecutionContext {
  /**
   * Permite aguardar uma promise completar após a resposta ser enviada.
   * @param promise - Promise para aguardar
   */
  waitUntil(promise: Promise<any>): void;
  /**
   * Permite que a requisição passe mesmo se ocorrer uma exceção.
   */
  passThroughOnException(): void;
}

/**
 * Objeto de contexto do Hono contendo o contexto de execução do Cloudflare.
 */
export interface HonoCloudflareContext {
  /** Contexto de execução do Cloudflare Workers */
  executionCtx: ExecutionContext;
}
