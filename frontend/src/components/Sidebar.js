'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiShoppingBag,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';

const navItems = [
  {
    section: 'Principal',
    items: [{ href: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' }],
  },
  {
    section: 'Operação',
    items: [
      { href: '/admin/pedidos', icon: FiShoppingBag, label: 'Pedidos' },
      { href: '/admin/estoque', icon: FiPackage, label: 'Estoque' },
      { href: '/admin/financeiro', icon: FiDollarSign, label: 'Financeiro' },
      { href: '/admin/clientes', icon: FiUsers, label: 'Clientes' },
    ],
  },
  {
    section: 'Gestão',
    items: [
      { href: '/admin/relatorios', icon: FiFileText, label: 'Relatórios' },
      { href: '/admin/perfil', icon: FiUser, label: 'Perfil' },
    ],
  },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <button
        type="button"
        className="sidebar__toggle"
        onClick={() => setMobileOpen((value) => !value)}
        aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">LZ</div>
          <div>
            <div className="sidebar__brand-name">Lojinha do Zé</div>
            <div className="sidebar__brand-sub">Operação e gestão</div>
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
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar__link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="sidebar__link-icon">
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <Link href="/login" className="sidebar__user" onClick={handleLogout} title="Sair">
            <div className="sidebar__avatar">{user?.avatar || 'U'}</div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{user?.name || 'Usuário'}</div>
              <div className="sidebar__user-role">Administrador</div>
            </div>
            <FiLogOut style={{ marginLeft: 'auto', opacity: 0.7, flexShrink: 0 }} />
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="loja-overlay"
          style={{ zIndex: 105 }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
