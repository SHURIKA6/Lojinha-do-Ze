import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialogProvider';
import { AuthContext } from '@/core/contexts/AuthContext';
import { AuthContextType } from '@/types';
import { jest } from '@jest/globals';

const defaultAuthValue: AuthContextType = {
  user: null,
  loading: false,
  login: jest.fn<any>(),
  logout: jest.fn<any>(),
  refreshUser: jest.fn<any>(),
  setUser: jest.fn<any>(),
  isAdmin: false,
  isCustomer: false,
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<AuthContextType>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { authValue = {}, ...options }: CustomRenderOptions = {}
) {
  const value = { ...defaultAuthValue, ...authValue } as AuthContextType;

  function Wrapper({ children }: { children: React.ReactNode }) {
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
