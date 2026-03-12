'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLogOut } from 'react-icons/fi';

const navLinks = [
  { href: '/cliente', label: 'Início' },
  { href: '/cliente/servicos', label: 'Meus Serviços' },
  { href: '/cliente/pagamentos', label: 'Pagamentos' },
  { href: '/cliente/perfil', label: 'Meu Perfil' },
];

export default function ClienteLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Carregando...
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div>
      <div className="customer-topbar">
        <div className="customer-topbar__brand">
          <div className="customer-topbar__logo">LZ</div>
          <span className="customer-topbar__name">Lojinha do Zé</span>
        </div>
        <nav className="customer-topbar__nav">
          {navLinks.map(link => (
            <a
              key={link.href}
              className={`customer-topbar__link ${pathname === link.href ? 'active' : ''}`}
              onClick={() => router.push(link.href)}
            >
              {link.label}
            </a>
          ))}
          <a className="customer-topbar__link" onClick={handleLogout} style={{ color: 'var(--danger-500)' }}>
            <FiLogOut style={{ marginRight: '4px' }} /> Sair
          </a>
        </nav>
      </div>
      <div className="customer-content">
        {children}
      </div>
    </div>
  );
}
