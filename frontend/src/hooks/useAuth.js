'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token salvo e carregar dados do usuário
    const token = localStorage.getItem('token');
    if (token) {
      // Simular carregamento do usuário - em produção, fazer chamada à API
      setUser({ isAdmin: true });
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    // Implementar lógica de login
    setUser({ isAdmin: true });
    localStorage.setItem('token', 'mock-token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout,
      isAdmin: user?.isAdmin || false
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}