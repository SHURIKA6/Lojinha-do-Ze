'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '@/services/api/auth';
import { login as apiLogin, logout as apiLogout } from '@/services/api/auth';
import { useToast } from '@/components/ui/ToastProvider';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const userData = await getMe();
    setUser(userData);
    return userData;
  };

  useEffect(() => {
    refreshUser()
      .catch(() => {
        setUser(null);
      })
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

  const login = async (identifier, password) => {
    try {
      const data = await apiLogin(identifier, password);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
