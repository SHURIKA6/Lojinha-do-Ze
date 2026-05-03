/**
 * Definições de tipos para o SDK do Mercado Pago.
 * Esta declaração de módulo fornece tipos TypeScript para o pacote npm mercadopago.
 */
declare module 'mercadopago' {
  /**
   * Classe de configuração para o SDK do Mercado Pago.
   * Inicializa o cliente com token de acesso e configurações opcionais de timeout.
   */
  export class MercadoPagoConfig {
    /**
     * Cria uma nova instância de MercadoPagoConfig.
     *
     * @param options - Opções de configuração
     * @param options.accessToken - Token de acesso do Mercado Pago (produção ou sandbox)
     * @param options.options - Opções adicionais como timeout em milissegundos
     */
    constructor(options: { accessToken: string; options?: { timeout?: number } });
  }

  /**
   * Classe Payment para criar, recuperar e cancelar pagamentos via API do Mercado Pago.
   * Suporta diversos métodos de pagamento, incluindo PIX, cartão de crédito e boleto.
   */
  export class Payment {
    /**
     * Cria uma nova instância de Payment.
     *
     * @param client - Instância de MercadoPagoConfig
     */
    constructor(client: MercadoPagoConfig);

    /**
     * Cria um novo pagamento no Mercado Pago.
     *
     * @param options - Opções para criação do pagamento
     * @param options.body - Dados do pagamento (valor, método de pagamento, informações do pagador, etc.)
     * @param options.idempotencyKey - Chave única opcional para prevenir pagamentos duplicados
     * @returns Promise que resolve para a resposta do pagamento do Mercado Pago
     */
    create(options: { body: Record<string, any>; idempotencyKey?: string }): Promise<PaymentResponse>;

    /**
     * Recupera um pagamento pelo seu ID.
     *
     * @param options - Opções contendo o ID do pagamento
     * @param options.id - Identificador único do pagamento
     * @returns Promise que resolve para a resposta do pagamento do Mercado Pago
     */
    get(options: { id: string }): Promise<PaymentResponse>;

    /**
     * Cancela um pagamento pendente.
     *
     * @param options - Opções contendo o ID do pagamento
     * @param options.id - Identificador único do pagamento
     * @returns Promise que resolve para a resposta do pagamento do Mercado Pago
     */
    cancel(options: { id: string }): Promise<PaymentResponse>;
  }

  /**
   * Interface de resposta para operações de pagamento do Mercado Pago.
   * Contém status do pagamento, detalhes e dados de QR code para pagamentos PIX.
   */
  export interface PaymentResponse {
    /** Identificador único do pagamento atribuído pelo Mercado Pago */
    id?: number;
    /** Status atual do pagamento (ex: 'approved', 'pending', 'cancelled') */
    status?: string;
    /** Informações detalhadas sobre o status do pagamento */
    status_detail?: string;
    /** ID de referência externa (geralmente o ID do pedido interno) */
    external_reference?: string;
    /** Dados de ponto de interação contendo QR code para pagamentos PIX */
    point_of_interaction?: {
      /** Dados da transação para pagamentos PIX */
      transaction_data?: {
        /** String do QR code PIX para copiar/colar ou exibir */
        qr_code?: string;
        /** QR code PIX em formato base64 para exibir como imagem */
        qr_code_base64?: string;
        /** URL do boleto para pagamento (utilizado em alguns métodos de pagamento) */
        ticket_url?: string;
      };
    };
    /** Permite propriedades adicionais da API do Mercado Pago */
    [key: string]: any;
  }
}
