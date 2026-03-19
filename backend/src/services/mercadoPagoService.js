import { MercadoPagoConfig, Payment } from 'mercadopago';
import { logger } from '../utils/logger.js';

export class MercadoPagoService {
  constructor(accessToken) {
    this.client = new MercadoPagoConfig({ 
      accessToken,
      options: { timeout: 5000 }
    });
    this.payment = new Payment(this.client);
  }

  /**
   * Cria um pagamento via Pix
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async createPixPayment({ transaction_amount, description, email, first_name, last_name, identification_type, identification_number, external_reference, idempotencyKey }) {
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
            number: identification_number
          }
        },
        installments: 1,
      };

      const requestOptions = idempotencyKey ? { idempotencyKey } : {};
      const result = await this.payment.create({ body, ...requestOptions });
      
      return {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        qr_code: result.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
        ticket_url: result.point_of_interaction.transaction_data.ticket_url,
        external_reference: result.external_reference
      };
    } catch (error) {
      logger.error('Erro ao criar pagamento no Mercado Pago', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de um pagamento
   * @param {string} paymentId 
   * @returns {Promise<Object>}
   */
  async getPayment(paymentId) {
    try {
      return await this.payment.get({ id: paymentId });
    } catch (error) {
      logger.error('Erro ao buscar pagamento no Mercado Pago', error, { paymentId });
      throw error;
    }
  }
}
