import { MercadoPagoConfig, Payment } from 'mercadopago';
import { logger } from '../../core/utils/logger';

// Polyfill para compatibilidade do SDK do Mercado Pago com Cloudflare Workers
if (typeof Headers !== 'undefined' && !(Headers.prototype as any).raw) {
  (Headers.prototype as any).raw = function() {
    const result: Record<string, string[]> = {};
    for (const [key, value] of (this as any).entries()) {
      result[key] = [value];
    }
    return result;
  };
}

/**
 * Dados necessários para criar um pagamento PIX via Mercado Pago.
 * Esta interface define todos os campos obrigatórios e opcionais para
 * processar um pagamento instantâneo via PIX.
 */
export interface PixPaymentData {
  /** Valor da transação em reais (ex: 100.50 para R$ 100,50) */
  transaction_amount: number;
  /** Descrição do pagamento (ex: "Pedido #123 - Lojinha do Zé") */
  description: string;
  /** Email do pagador (comprador) */
  email: string;
  /** Primeiro nome do pagador */
  first_name: string;
  /** Sobrenome do pagador */
  last_name: string;
  /** Tipo de identificação do pagador (ex: "CPF", "CNPJ"). Padrão: "CPF" */
  identification_type?: string;
  /** Número do documento de identificação (CPF ou CNPJ) */
  identification_number: string;
  /** Referência externa para rastrear o pagamento (geralmente o ID do pedido) */
  external_reference: string;
  /** Chave de idempotência para evitar pagamentos duplicados */
  idempotencyKey?: string;
}

/**
 * Serviço para integração com o Mercado Pago.
 * 
 * Esta classe encapsula todas as operações relacionadas ao Mercado Pago,
 * incluindo criação de pagamentos PIX, consulta de status e cancelamento.
 * 
 * O fluxo de pagamento PIX funciona da seguinte forma:
 * 1. O cliente solicita um pagamento PIX informando os dados do pedido
 * 2. O serviço cria o pagamento no Mercado Pago e retorna o QR Code
 * 3. O cliente escaneia o QR Code e realiza o pagamento no app do banco
 * 4. O Mercado Pago envia uma notificação via webhook quando o pagamento é aprovado
 * 5. O sistema processa o webhook e atualiza o status do pedido
 */
export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private payment: Payment;

  /**
   * Cria uma nova instância do serviço Mercado Pago.
   * 
   * @param accessToken - Token de acesso do Mercado Pago (obtenido no painel do desenvolvedor)
   */
  constructor(accessToken: string) {
    this.client = new MercadoPagoConfig({ 
      accessToken,
      options: { timeout: 5000 }
    });
    this.payment = new Payment(this.client);
  }

  /**
   * Cria um pagamento via PIX no Mercado Pago.
   * 
   * Este método é responsável por:
   * - Configurar os dados do pagamento (valor, descrição, pagador)
   * - Definir a expiração do PIX (30 minutos)
   * - Enviar a solicitação para a API do Mercado Pago
   * - Retornar os dados necessários para exibir o QR Code ao cliente
   * 
   * @param params - Dados do pagamento PIX
   * @param params.transaction_amount - Valor da transação em reais
   * @param params.description - Descrição do pagamento
   * @param params.email - Email do pagador
   * @param params.first_name - Primeiro nome do pagador
   * @param params.last_name - Sobrenome do pagador
   * @param params.identification_type - Tipo de documento (opcional, padrão: CPF)
   * @param params.identification_number - Número do CPF/CNPJ
   * @param params.external_reference - Referência externa (ex: ID do pedido)
   * @param params.idempotencyKey - Chave de idempotência para evitar duplicação
   * 
   * @returns Objeto contendo os dados do pagamento criado, incluindo:
   *   - id: ID do pagamento no Mercado Pago
   *   - status: Status atual do pagamento
   *   - status_detail: Detalhes do status
   *   - qr_code: Código QR para pagamento PIX
   *   - qr_code_base64: QR Code em formato base64 (para exibição em imagem)
   *   - ticket_url: URL para pagamento (pode ser usada como link)
   *   - external_reference: Referência externa retornada
   * 
   * @throws {Error} Lança erro se a criação do pagamento falhar no Mercado Pago
   */
  async createPixPayment({ 
    transaction_amount, 
    description, 
    email, 
    first_name, 
    last_name, 
    identification_type, 
    identification_number, 
    external_reference, 
    idempotencyKey 
  }: PixPaymentData) {
    try {
      const body = {
        transaction_amount,
        description,
        payment_method_id: 'pix',
        external_reference,
        payer: {
          email,
          first_name,
          last_name,
          identification: {
            type: identification_type || 'CPF',
            number: String(identification_number).replace(/\D/g, '')
          }
        },
        installments: 1,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      logger.info('Creating PIX payment', {
        amount: transaction_amount,
        external_reference,
        email: email.substring(0, 3) + '***',
      });

      const requestOptions = idempotencyKey ? { idempotencyKey } : {};
      const result = await this.payment.create({ body, ...requestOptions });
      
      const transactionData = (result as any).point_of_interaction?.transaction_data;

      logger.info('PIX payment created successfully', {
        paymentId: result.id,
        status: result.status,
      });

      return {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        qr_code: transactionData?.qr_code,
        qr_code_base64: transactionData?.qr_code_base64,
        ticket_url: transactionData?.ticket_url,
        external_reference: result.external_reference
      };
    } catch (error: any) {
      // Capturar detalhes completos do erro do SDK
      const errorDetails: Record<string, any> = {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      };

      // SDK do Mercado Pago pode retornar status e response body
      if (error.status) errorDetails.status = error.status;
      if (error.statusCode) errorDetails.statusCode = error.statusCode;
      if (error.response) {
        try {
          errorDetails.response = typeof error.response === 'string' ? error.response : JSON.stringify(error.response);
        } catch {
          errorDetails.response = '[non-serializable]';
        }
      }
      if (error.cause?.message) errorDetails.causeMessage = error.cause.message;

      logger.error('Detailed Mercado Pago Error', null as any, errorDetails);
      throw new Error(error.message || 'Erro ao criar pagamento no Mercado Pago', { cause: error });
    }
  }

  /**
   * Busca os detalhes de um pagamento no Mercado Pago.
   * 
   * Este método consulta a API do Mercado Pago para obter informações
   * atualizadas sobre um pagamento específico, como status, valor,
   * pagador e dados de processamento.
   * 
   * @param paymentId - ID do pagamento no Mercado Pago (pode ser string ou number)
   * 
   * @returns Objeto completo do pagamento retornado pelo Mercado Pago,
   *          contendo status, detalhes, dados do pagador, etc.
   * 
   * @throws {Error} Lança erro se o pagamento não for encontrado ou se houver
   *         falha na comunicação com o Mercado Pago
   */
  async getPayment(paymentId: string | number) {
    try {
      return await this.payment.get({ id: String(paymentId) });
    } catch (error) {
      logger.error('Erro ao buscar pagamento no Mercado Pago', error as Error, { paymentId: String(paymentId) });
      throw error;
    }
  }

  /**
   * Cancela um pagamento no Mercado Pago.
   * 
   * Este método é usado para cancelar pagamentos que estão pendentes ou
   * que precisam ser estornados. O cancelamento pode ser feito apenas para
   * pagamentos que ainda não foram aprovados ou que permitam cancelamento.
   * 
   * Casos de uso:
   * - Cliente desistiu da compra antes de pagar o PIX
   * - Pedido foi cancelado pelo lojista
   * - Erro no processamento que requer cancelamento manual
   * 
   * @param paymentId - ID do pagamento a ser cancelado (pode ser string ou number)
   * 
   * @returns Objeto do pagamento após o cancelamento, com o status atualizado
   * 
   * @throws {Error} Lança erro se o cancelamento falhar (ex: pagamento já aprovado,
   *         pagamento inexistente, ou erro de comunicação)
   */
  async cancelPayment(paymentId: string | number) {
    try {
      return await this.payment.cancel({
        id: String(paymentId)
      });
    } catch (error) {
      logger.error('Erro ao cancelar pagamento no Mercado Pago', error as Error, { paymentId: String(paymentId) });
      throw error;
    }
  }
}
