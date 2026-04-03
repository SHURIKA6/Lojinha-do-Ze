import { MercadoPagoConfig, Payment } from 'mercadopago';
import { logger } from '../utils/logger';

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

export interface PixPaymentData {
  transaction_amount: number;
  description: string;
  email: string;
  first_name: string;
  last_name: string;
  identification_type?: string;
  identification_number: string;
  external_reference: string;
  idempotencyKey?: string;
}

export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private payment: Payment;

  constructor(accessToken: string) {
    this.client = new MercadoPagoConfig({ 
      accessToken,
      options: { timeout: 5000 }
    });
    this.payment = new Payment(this.client);
  }

  /**
   * Cria um pagamento via Pix
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

      const requestOptions = idempotencyKey ? { idempotencyKey } : {};
      const result = await this.payment.create({ body, ...requestOptions });
      
      const transactionData = (result as any).point_of_interaction?.transaction_data;

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
      logger.error('Detailed Mercado Pago Error', null as any, {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      throw new Error(error.message || 'Erro ao criar pagamento no Mercado Pago', { cause: error });
    }
  }

  /**
   * Busca detalhes de um pagamento
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
   * Cancela um pagamento (Pix ou outro que permita cancelamento)
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
