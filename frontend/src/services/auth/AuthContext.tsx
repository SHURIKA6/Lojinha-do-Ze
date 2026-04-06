'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '@/services/api/auth';
import { useToast } from '@/components/ui/ToastProvider';
import { User, AuthContextType } from '@/types';
import { isCustomerRole, isShuraRole, isStaffRole, isUserRole } from '@/lib/roles';

export const AuthContext = createContext<AuthContextType | null>(null);

function normalizeAuthUser(payload: unknown): User | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const user = payload as User;
  return isUserRole(user.role) ? user : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const isFetchingRef = React.useRef(false);

  const refreshUser = React.useCallback(async (): Promise<User | null> => {
    // Usar ref em vez de estado dentro do callback para evitar dependências cíclicas
    if (isFetchingRef.current) return null;
    
    isFetchingRef.current = true;
    setIsFetching(true);
    
    try {
      const res = await getMe() as any;
      const actualData = res.success ? res.data : res;
      const userData = normalizeAuthUser(actualData?.user);
      
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const login = React.useCallback(async (identifier: string, password: string): Promise<{ 
    success: boolean; 
    user?: User | null; 
    error?: string; 
    easterEgg?: boolean;
    shuraEgg?: boolean;
  }> => {
    try {
      const res = await apiLogin(identifier, password) as any;
      const actualData = res.success ? res.data : res;
      const userData = normalizeAuthUser(actualData?.user);

      if (!userData) {
        setUser(null);
        return { success: false, error: 'Conta com cargo inválido. Entre em contato com o suporte.' };
      }
      
      setUser(userData);
      
      // Easter egg detect
      const isEasterEmail = identifier.toLowerCase() === process.env.NEXT_PUBLIC_EASTER_EMAIL || userData?.email === process.env.NEXT_PUBLIC_EASTER_EMAIL;
      const isShuraEmail = identifier.toLowerCase() === process.env.NEXT_PUBLIC_SHURA_EMAIL || userData?.email === process.env.NEXT_PUBLIC_SHURA_EMAIL;
      
      return { 
        success: true, 
        user: userData, 
        easterEgg: isEasterEmail,
        shuraEgg: isShuraEmail 
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = React.useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
  }, []);

  const isAdmin = React.useMemo(() => isStaffRole(user?.role), [user]);
  const isShura = React.useMemo(() => isShuraRole(user?.role), [user]);
  const isCustomer = React.useMemo(() => isCustomerRole(user?.role), [user]);

  const value = React.useMemo(() => ({
    user,
    login,
    logout,
    loading,
    refreshUser,
    setUser,
    isAdmin,
    isShura,
    isCustomer
  }), [user, login, logout, loading, refreshUser, isAdmin, isShura, isCustomer]);

  return (
    <AuthContext.Provider value={value}>
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
