'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiGrid, FiPackage, FiDollarSign, FiUsers,
  FiFileText, FiUser, FiLogOut, FiMenu, FiX, FiShoppingBag
} from 'react-icons/fi';

const navItems = [
  { section: 'Principal', items: [
    { href: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' },
  ]},
  { section: 'Gestão', items: [
    { href: '/admin/pedidos', icon: FiShoppingBag, label: 'Pedidos da Loja' },
    { href: '/admin/estoque', icon: FiPackage, label: 'Estoque' },
    { href: '/admin/financeiro', icon: FiDollarSign, label: 'Financeiro' },
    { href: '/admin/clientes', icon: FiUsers, label: 'Clientes' },
  ]},
  { section: 'Outros', items: [
    { href: '/admin/relatorios', icon: FiFileText, label: 'Relatórios' },
    { href: '/admin/perfil', icon: FiUser, label: 'Perfil' },
  ]},
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleNavigate = (href) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <button className="sidebar__toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">ZÉ</div>
          <div className="sidebar__brand-text">
            <div className="sidebar__brand-name">Marmitas do Zé</div>
            <div className="sidebar__brand-sub">Sistema de Gestão</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((section) => (
            <div key={section.section} className="sidebar__section">
              <div className="sidebar__section-title">{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    className={`sidebar__link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavigate(item.href)}
                  >
                    <span className="sidebar__link-icon"><Icon /></span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user" onClick={handleLogout} title="Sair">
            <div className="sidebar__avatar">{user?.avatar || 'U'}</div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user?.name || 'Usuário'}</div>
              <div className="sidebar__user-role">Administrador</div>
            </div>
            <FiLogOut style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 99
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
