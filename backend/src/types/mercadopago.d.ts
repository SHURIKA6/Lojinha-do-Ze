declare module 'mercadopago' {
  export class MercadoPagoConfig {
    constructor(options: { accessToken: string; options?: { timeout?: number } });
  }

  export class Payment {
    constructor(client: MercadoPagoConfig);
    create(options: { body: Record<string, any>; idempotencyKey?: string }): Promise<PaymentResponse>;
    get(options: { id: string }): Promise<PaymentResponse>;
    cancel(options: { id: string }): Promise<PaymentResponse>;
  }

  export interface PaymentResponse {
    id?: number;
    status?: string;
    status_detail?: string;
    external_reference?: string;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    };
    [key: string]: any;
  }
}
