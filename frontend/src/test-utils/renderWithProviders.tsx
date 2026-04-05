import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { AuthContext } from '@/services/auth/AuthContext';
import { AuthContextType } from '@/types';

const defaultAuthValue: AuthContextType = {
  user: null,
  loading: false,
  login: async () => ({ success: true }),
  logout: async () => {},
  refreshUser: async () => null,
  setUser: () => {},
  isAdmin: false,
  isCustomer: false,
};

export function renderWithProviders(ui: React.ReactElement, { authValue = {}, ...options }: any = {}) {
  const value = { ...defaultAuthValue, ...authValue };

  function Wrapper({ children }: { children: ReactNode }) {
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
