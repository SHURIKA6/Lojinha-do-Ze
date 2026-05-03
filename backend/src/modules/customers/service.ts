import { Database, Bindings, ExecutionContext } from '../../core/types';
import * as customerRepo from './repository';
import {
  buildAvatar,
  cleanOptionalString,
  isValidCpf,
  normalizeCpfDigits,
  normalizeEmail,
  normalizePhoneDigits,
} from '../../core/utils/normalize';
import { generatePasswordSetupInvite } from '../auth/service';

/**
 * Serviço para gerenciamento de clientes.
 * Fornece operações CRUD e funcionalidades adicionais como convites e estatísticas.
 */
export class CustomerService {
  constructor(private db: Database, private env?: Bindings, private ctx?: ExecutionContext) {}

  /**
   * Lista todos os clientes com paginação.
   * @param limit - Limite de resultados por página.
   * @param offset - Deslocamento para paginação.
   * @returns Lista de clientes.
   */
  async getAllCustomers(limit: number, offset: number) {
    return customerRepo.findAllCustomers(this.db, limit, offset);
  }

  /**
   * Busca um cliente pelo ID, incluindo estatísticas de pedidos.
   * @param id - ID do cliente.
   * @returns Cliente com estatísticas ou null se não encontrado.
   */
  async getCustomerById(id: string) {
    const customer = await customerRepo.findCustomerById(this.db, id);
    if (!customer) return null;

    const normalizedPhone = normalizePhoneDigits(customer.phone || '');
    const stats = await customerRepo.getCustomerStats(this.db, id, normalizedPhone);

    return {
      ...customer,
      total_spent: parseFloat(stats.total_spent),
      order_count: parseInt(stats.order_count, 10),
    };
  }

  /**
   * Lista os pedidos de um cliente específico (via ID ou telefone).
   * @param id - ID do cliente.
   * @returns Lista de pedidos do cliente ou null se não encontrado.
   */
  async getCustomerOrders(id: string) {
    const customer = await customerRepo.findCustomerById(this.db, id);
    if (!customer) return null;

    const normalizedPhone = normalizePhoneDigits(customer.phone || '');
    return customerRepo.findOrdersByCustomer(this.db, id, normalizedPhone);
  }

  /**
   * Cria um novo cliente com validação de CPF e gera convite de senha.
   * 
   * Fluxo:
   * 1. Valida e normaliza dados (CPF, email, telefone)
   * 2. Cria o cliente no banco
   * 3. Gera convite para definição de senha
   * 
   * @param payload - Dados do cliente a ser criado.
   * @param env - Variáveis de ambiente (opcional, usa this.env como fallback).
   * @param ctx - Contexto de execução (opcional).
   * @returns Cliente criado com link de convite.
   */
  async createCustomer(payload: any, env?: Bindings, ctx?: ExecutionContext) {
    const activeEnv = env || this.env;
    const activeCtx = ctx || this.ctx;

    if (payload.cpf && !isValidCpf(payload.cpf)) {
      throw new Error('CPF_INVALID');
    }

    const cleanName = payload.name.trim();
    const cleanEmail = normalizeEmail(payload.email);
    const cleanPhone = cleanOptionalString(payload.phone)?.trim() || null;
    const cleanCpf = payload.cpf ? normalizeCpfDigits(payload.cpf) : null;
    const cleanAddress = cleanOptionalString(payload.address) ?? null;
    const cleanNotes = cleanOptionalString(payload.notes) ?? null;
    const avatar = buildAvatar(cleanName);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const createdCustomer = await customerRepo.createCustomer(client, {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        cpf: cleanCpf,
        address: cleanAddress,
        notes: cleanNotes,
        avatar: avatar,
      });

      const invite = await generatePasswordSetupInvite({ env: activeEnv, req: { url: activeEnv?.FRONTEND_URL || '' } } as any, client, createdCustomer as any);

      await client.query('COMMIT');
      return { ...createdCustomer, invite };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client.release) client.release();
    }
  }

  /**
   * Atualiza os dados de um cliente existente.
   * @param id - ID do cliente a ser atualizado.
   * @param payload - Novos dados do cliente.
   * @returns Cliente atualizado.
   */
  async updateCustomer(id: string, payload: any) {
    if (payload.cpf && !isValidCpf(payload.cpf)) {
      throw new Error('CPF_INVALID');
    }

    const cleanName = payload.name?.trim();
    const cleanEmail = payload.email !== undefined ? normalizeEmail(payload.email) : undefined;
    const cleanPhone =
      payload.phone !== undefined ? cleanOptionalString(payload.phone)?.trim() || null : undefined;
    const cleanCpf = payload.cpf ? normalizeCpfDigits(payload.cpf) : undefined;
    const cleanAddress =
      payload.address !== undefined ? cleanOptionalString(payload.address) : undefined;
    const cleanNotes =
      payload.notes !== undefined ? cleanOptionalString(payload.notes) : undefined;
    const avatar = cleanName ? buildAvatar(cleanName) : undefined;

    return customerRepo.updateCustomer(this.db, id, {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      cpf: cleanCpf,
      address: cleanAddress,
      notes: cleanNotes,
      avatar: avatar,
    });
  }

  /**
   * Atualiza o papel (role) de um cliente no sistema.
   * @param id - ID do cliente.
   * @param role - Novo papel ('admin', 'customer', 'guest').
   * @returns Cliente com role atualizada.
   */
  async updateRole(id: string, role: string) {
    return customerRepo.updateCustomerRole(this.db, id, role);
  }

  /**
   * Remove um cliente do sistema.
   * @param id - ID do cliente a ser removido.
   * @returns Resultado da operação.
   */
  async deleteCustomer(id: string) {
    return customerRepo.deleteCustomer(this.db, id);
  }

  /**
   * Obtém a senha do usuário para fins de verificação.
   * @param id - ID do cliente.
   * @returns Hash da senha do usuário.
   */
  async getPasswordForVerification(id: string) {
    return customerRepo.getUserPassword(this.db, id);
  }

  /**
   * Gera um novo convite para definição de senha do cliente.
   * Clientes com role 'guest' não podem receber convites.
   * @param id - ID do cliente.
   * @param env - Variáveis de ambiente.
   * @param ctx - Contexto de execução.
   * @returns Cliente com novo link de convite ou null.
   */
  async inviteCustomer(id: string, env?: Bindings, ctx?: ExecutionContext) {
    const activeEnv = env || this.env;
    const activeCtx = ctx || this.ctx;
    const customer = await customerRepo.findCustomerById(this.db, id);
    if (!customer || (customer as any).role === 'guest') return null;

    const client = await this.db.connect();
    try {
      const invite = await generatePasswordSetupInvite({ env: activeEnv, req: { url: activeEnv?.FRONTEND_URL || '' } } as any, client, customer as any);
      return { ...customer, invite };
    } finally {
      if (client.release) client.release();
    }
  }
}
