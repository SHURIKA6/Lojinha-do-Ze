'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/core/contexts/AuthContext';
import { FiLogOut, FiShoppingBag } from 'react-icons/fi';

const navLinks = [
  { href: '/conta', label: 'Meus Pedidos' },
  { href: '/conta/perfil', label: 'Meu Perfil' },
  { href: '/conta/fidelidade', label: 'Meus Pontos' },
];

interface ClienteLayoutClientProps {
  children: React.ReactNode;
}

export default function ClienteLayoutClient({ children }: ClienteLayoutClientProps) {
  const { user, loading, logout, isAdmin, isCustomer } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isCustomer) {
      router.replace(isAdmin ? '/admin/dashboard' : '/');
    }
  }, [user, loading, isAdmin, isCustomer, router]);

  if (loading || !user || !isCustomer) {
    return (
      <div className="app-loader" aria-live="polite">
        <div className="app-loader__spinner" />
        <p>Carregando sua conta...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div>
      <div className="customer-topbar">
        <div className="customer-topbar__brand">
          <div className="customer-topbar__logo">
            <img src="/images/logo.png" alt="Lojinha do Zé Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          </div>
          <span className="customer-topbar__name">Lojinha do Zé</span>
        </div>

        <nav className="customer-topbar__nav" aria-label="Navegação da conta">
          {(Array.isArray(navLinks) ? navLinks : []).map((link) => (
            <button
              key={link.href}
              type="button"
              className={`customer-topbar__link ${pathname === link.href ? 'active' : ''}`}
              onClick={() => router.push(link.href)}
            >
              {link.label}
            </button>
          ))}

          <button type="button" className="customer-topbar__link" onClick={() => router.push('/')}>
            <FiShoppingBag />
            Loja
          </button>

          <button
            type="button"
            className="customer-topbar__link"
            onClick={handleLogout}
            style={{ color: 'var(--danger-500)' }}
          >
            <FiLogOut />
            Sair
          </button>
        </nav>
      </div>

      <main className="customer-content">{children}</main>
    </div>
  );
}
