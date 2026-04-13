import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ClientesPage from './page';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

const mockCreateCustomer = jest.fn();
const mockDeleteCustomer = jest.fn();
const mockGetCustomer = jest.fn();
const mockGetCustomerOrders = jest.fn();
const mockGetCustomers = jest.fn();
const mockSendCustomerInvite = jest.fn();
const mockUpdateCustomer = jest.fn();
const mockUpdateUserRole = jest.fn();

jest.mock('@/core/api/customers', () => ({
  createCustomer: (...args: any[]) => mockCreateCustomer(...args),
  deleteCustomer: (...args: any[]) => mockDeleteCustomer(...args),
  getCustomer: (...args: any[]) => mockGetCustomer(...args),
  getCustomerOrders: (...args: any[]) => mockGetCustomerOrders(...args),
  getCustomers: (...args: any[]) => mockGetCustomers(...args),
  sendCustomerInvite: (...args: any[]) => mockSendCustomerInvite(...args),
  updateCustomer: (...args: any[]) => mockUpdateCustomer(...args),
  updateUserRole: (...args: any[]) => mockUpdateUserRole(...args),
}));

jest.mock('@/core/utils/formatting', () => ({
  formatCpf: (value: string) => value,
  formatCurrency: (value: number) => `R$ ${value}`,
  formatDate: () => '01/01/2026',
  getStatusLabel: (value: string) => value,
  getStatusVariant: () => 'neutral',
  formatAddress: (value: any) => value,
}));

jest.mock('@/utils/validation', () => ({
  isValidCpf: () => true,
}));

describe('ClientesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCustomers.mockResolvedValue([
      {
        id: 'user-1',
        name: 'Ana Admin',
        email: 'ana@example.com',
        phone: '(65) 99999-0000',
        role: 'admin',
        created_at: '2026-03-28T00:00:00.000Z',
      },
    ]);
    mockGetCustomer.mockResolvedValue({});
    mockGetCustomerOrders.mockResolvedValue([]);
    mockDeleteCustomer.mockResolvedValue({});
    mockUpdateUserRole.mockResolvedValue({});
  });

  it('solicita senha administrativa antes de excluir um usuário', async () => {
    renderWithProviders(<ClientesPage />);

    await screen.findByText('Ana Admin');

    fireEvent.click(screen.getByLabelText('Excluir Ana Admin'));

    expect(screen.getByRole('heading', { name: 'Excluir usuário' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Senha Administrativa'), {
      target: { value: 'SenhaForte#123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir usuário' }));

    await waitFor(() => {
      expect(mockDeleteCustomer).toHaveBeenCalledWith('user-1', 'SenhaForte#123');
    });
  });

  it('envia a confirmação de senha ao alterar o cargo', async () => {
    renderWithProviders(<ClientesPage />);

    await screen.findByText('Ana Admin');

    fireEvent.click(screen.getByLabelText('Alterar cargo de Ana Admin'));

    fireEvent.change(screen.getByLabelText('Senha Administrativa'), {
      target: { value: 'SenhaForte#123' },
    });
    fireEvent.click(screen.getByText('Confirmar Alteração'));

    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith('user-1', 'customer', 'SenhaForte#123');
    });
  });
});
