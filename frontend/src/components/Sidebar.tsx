'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';
import {
  FiChevronLeft,
  FiChevronRight,
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
  FiCpu,
  FiHome,
} from 'react-icons/fi';

import { IconType } from 'react-icons';

interface NavItem {
  href: string;
  icon: IconType;
  label: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const navItems: NavSection[] = [
  {
    section: 'Principal',
    items: [
      { href: '/', icon: FiHome, label: 'Voltar para a Loja' },
      { href: '/admin/dashboard', icon: FiGrid, label: 'Dashboard' },
      { href: '/admin/ia', icon: FiCpu, label: 'Inteligência Artificial' }
    ],
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

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 921px)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobileOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setMobileOpen(false);
    }

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
  };

  const userTitle = `${user?.name || 'Usuário'} - perfil e sessão`;
  const sidebarClassName = [
    styles.sidebar,
    collapsed ? styles.collapsed : '',
    mobileOpen ? styles.mobileOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setMobileOpen((value) => !value)}
        aria-controls="admin-sidebar"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
      >
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>

      <aside id="admin-sidebar" className={sidebarClassName}>
        <div className={styles.header}>
          <div className={styles.brand} title={collapsed ? 'Lojinha do Zé' : undefined}>
            <div className={styles.logo}>LZ</div>
            <div className={styles.brandCopy} aria-hidden={collapsed}>
              <div className={styles.brandName}>Lojinha do Zé</div>
              <div className={styles.brandSub}>Operação e gestão</div>
            </div>
          </div>

          <button
            type="button"
            className={styles.desktopToggle}
            onClick={onToggleCollapsed}
            aria-controls="admin-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir navegação lateral' : 'Recolher navegação lateral'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className={styles.nav}>
          {(Array.isArray(navItems) ? navItems : []).map((section) => (
            <div key={section.section} className={styles.section}>
              <div
                className={styles.sectionTitle}
                aria-hidden={collapsed}
                title={collapsed ? section.section : undefined}
              >
                {section.section}
              </div>
              {(Array.isArray(section.items) ? section.items : []).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                   <Link
                     key={item.href}
                     href={item.href}
                     className={`${styles.link} ${isActive ? styles.active : ''}`}
                     onClick={(e) => {
                       // Corrige bug de navegação: aguarda a navegação acontecer antes de alterar estado
                       setTimeout(() => setMobileOpen(false), 0);
                     }}
                     title={collapsed ? item.label : undefined}
                     aria-label={collapsed ? item.label : undefined}
                   >
                    <span className={styles.linkIcon}>
                      <Icon />
                    </span>
                    <span className={styles.linkLabel} aria-hidden={collapsed}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.user} title={collapsed ? userTitle : undefined}>
            <Link
              href="/admin/perfil"
              className={styles.avatar}
              onClick={() => {
                setTimeout(() => setMobileOpen(false), 0);
              }}
              title={collapsed ? 'Abrir perfil' : undefined}
              aria-label={collapsed ? 'Abrir perfil' : undefined}
            >
              {user?.avatar || (user?.name ? user.name[0].toUpperCase() : 'U')}
            </Link>
            <Link
              href="/admin/perfil"
              className={styles.userInfo}
              onClick={() => {
                setTimeout(() => setMobileOpen(false), 0);
              }}
              aria-hidden={collapsed}
              tabIndex={collapsed ? -1 : undefined}
            >
              <div className={styles.userName}>{user?.name || 'Administrador'}</div>
              <div className={styles.userRole}>
                {user?.role === 'shura' ? '💎 SHURA' : 'Administrador'}
              </div>
            </Link>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
              title={collapsed ? 'Encerrar sessão' : 'Encerrar Sessão'}
              aria-label={collapsed ? 'Encerrar sessão' : undefined}
            >
              <FiLogOut />
            </button>
          </div>
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
