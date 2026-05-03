/**
 * Componente: Sidebar
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/core/contexts/AuthContext';
import styles from './Sidebar.module.css';
import { IconType } from 'react-icons';
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

interface NavItem {
  href: string;
  icon: IconType;
  label: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navItems: NavSection[] = [
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
        className={styles.toggle}
        onClick={() => setMobileOpen((value) => !value)}
        aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <img src="/images/logo.png" alt="Lojinha do Zé Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          </div>
          <div>
            <div className={styles.brandName}>Lojinha do Zé</div>
            <div className={styles.brandSub}>Operação e gestão</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((section) => (
            <div key={section.section} className={styles.section}>
              <div className={styles.sectionTitle}>{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.link} ${isActive ? styles.active : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className={styles.linkIcon}>
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <Link href="/login" className={styles.user} onClick={handleLogout} title="Sair">
            <div className={styles.avatar}>
              {user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/')) ? (
                <img src={user.avatar} alt="" role="presentation" />
              ) : (
                (user?.avatar || user?.name?.[0] || 'U')
              )}
            </div>
            <div>
              <div className={styles.userName}>{user?.name || 'Usuário'}</div>
              <div className={styles.userRole}>Administrador</div>
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
