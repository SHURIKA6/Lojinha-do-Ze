import { Context } from 'hono';
import { Database } from '../../core/types';
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

export class CustomerService {
  constructor(private db: Database) {}

  async getAllCustomers(limit: number, offset: number) {
    return customerRepo.findAllCustomers(this.db, limit, offset);
  }

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

  async getCustomerOrders(id: string) {
    const customer = await customerRepo.findCustomerById(this.db, id);
    if (!customer) return null;

    const normalizedPhone = normalizePhoneDigits(customer.phone || '');
    return customerRepo.findOrdersByCustomer(this.db, id, normalizedPhone);
  }

  async createCustomer(c: Context, payload: any) {
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

      const invite = await generatePasswordSetupInvite(c, client, createdCustomer as any);
      await client.query('COMMIT');
      return { ...createdCustomer, invite };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      if (client.release) client.release();
    }
  }

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

  async updateRole(id: string, role: string) {
    return customerRepo.updateCustomerRole(this.db, id, role);
  }

  async deleteCustomer(id: string) {
    return customerRepo.deleteCustomer(this.db, id);
  }

  async getPasswordForVerification(id: string) {
    return customerRepo.getUserPassword(this.db, id);
  }

  async inviteCustomer(c: Context, id: string) {
    const customer = await customerRepo.findCustomerById(this.db, id);
    if (!customer) return null;

    const client = await this.db.connect();
    try {
      const invite = await generatePasswordSetupInvite(c, client, customer as any);
      return { ...customer, invite };
    } finally {
      if (client.release) client.release();
    }
  }
}
