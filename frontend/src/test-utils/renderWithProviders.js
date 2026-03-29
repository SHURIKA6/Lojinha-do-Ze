import { jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { AuthContext } from '@/services/auth/AuthContext';

const defaultAuthValue = {
  user: null,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  refreshUser: jest.fn(),
  setUser: jest.fn(),
  isAdmin: false,
  isCustomer: false,
};

export function renderWithProviders(ui, { authValue = {}, ...options } = {}) {
  const value = { ...defaultAuthValue, ...authValue };

  function Wrapper({ children }) {
    return (
      <ToastProvider>
        <ConfirmDialogProvider>
          <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
        </ConfirmDialogProvider>
      </ToastProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    authValue: value,
  };
}
