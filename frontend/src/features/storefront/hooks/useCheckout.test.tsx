import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthContext } from '@/core/contexts/AuthContext';
import { useCheckout } from './useCheckout';

const mockCreateOrder = jest.fn();
const mockCreatePixPayment = jest.fn();
const mockGetPixPaymentStatus = jest.fn();

jest.mock('@/core/api', () => ({
  ...jest.requireActual('@/core/api'),
  createOrder: (...args: any[]) => mockCreateOrder(...args),
  createPixPayment: (...args: any[]) => mockCreatePixPayment(...args),
  getPixPaymentStatus: (...args: any[]) => mockGetPixPaymentStatus(...args),
}));

jest.mock('@/utils/validation', () => ({
  isValidCpf: (cpf: string) => cpf.replace(/\D/g, '').length === 11,
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AuthContext.Provider
          value={{
            user: null,
            loading: false,
            login: jest.fn(),
            logout: jest.fn(),
            refreshUser: jest.fn(),
            setUser: jest.fn(),
            isAdmin: false,
            isCustomer: false,
          }}
        >
          {children}
        </AuthContext.Provider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}

describe('useCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockCreateOrder.mockResolvedValue({
      id: 12,
      total: 15,
      customer_phone: '(65) 99999-0000',
      items: [{ productId: '1', name: 'Erva', quantity: 1, price: 10 }],
    });
    mockCreatePixPayment.mockResolvedValue({ id: 'pix-1', status: 'pending' });
  });

  it('envia Pix com e-mail e telefone reais e persiste apenas dados mínimos', async () => {
    const setError = jest.fn();
    const { result } = renderHook(
      () =>
        useCheckout({
          cart: [{ productId: '1', name: 'Erva', quantity: 1, price: 10 }],
          cartTotal: 10,
          setError,
          user: null,
        }),
      { wrapper: Wrapper }
    );

    act(() => {
      result.current.setCustomerForm({
        name: 'Ana Silva',
        phone: '(65) 99999-0000',
        email: 'ana@example.com',
        cpf: '12345678901',
        notes: 'Sem açúcar',
      });
      result.current.setCustomerAddress('Rua A, 123');
    });

    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(mockCreatePixPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 12,
        email: 'ana@example.com',
        phone: '(65) 99999-0000',
        identificationNumber: '12345678901',
      })
    );

    const stored = window.localStorage.getItem('lojinha_customer');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({
      name: 'Ana Silva',
      phone: '(65) 99999-0000',
      email: 'ana@example.com',
    });
  });
});
