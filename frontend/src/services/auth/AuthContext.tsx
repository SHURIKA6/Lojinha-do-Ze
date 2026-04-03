'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '@/services/api/auth';
import { useToast } from '@/components/ui/ToastProvider';
import { User, AuthContextType } from '@/types';

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const userData = await getMe();
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    refreshUser()
      .finally(() => setLoading(false));
  }, []);

  const toast = useToast();
  
  useEffect(() => {
    const handleExpiredSession = () => {
      if (user) {
        toast.info('Sua sessão expirou. Faça login novamente.', 'Sessão Expirada');
      }
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('auth:expired', handleExpiredSession);
    return () => window.removeEventListener('auth:expired', handleExpiredSession);
  }, [user, toast]);

  const login = async (identifier: string, password: string) => {
    try {
      const data = await apiLogin(identifier, password);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, refreshUser, setUser, isAdmin, isCustomer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
