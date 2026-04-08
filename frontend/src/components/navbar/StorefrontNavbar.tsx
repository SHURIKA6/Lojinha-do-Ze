'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiLogOut, FiSearch, FiShoppingCart, FiX } from 'react-icons/fi';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './StorefrontNavbar.module.css';

interface StorefrontNavbarProps {
  cartCount: number;
  onLogout?: () => void;
  onPortalClick: () => void;
  portalLabel: string;
  PortalIcon: React.ElementType;
  search: string;
  setActiveCategory: (category: string) => void;
  setCartOpen: (open: boolean) => void;
  setSearch: (search: string) => void;
}

export default function StorefrontNavbar({
  cartCount,
  onLogout,
  onPortalClick,
  portalLabel,
  PortalIcon,
  search,
  setActiveCategory,
  setCartOpen,
  setSearch,
}: StorefrontNavbarProps) {
  const [clickCount, setClickCount] = useState(0);
  const toast = useToast();

  const handleLogoClick = (e: React.MouseEvent) => {
    // Incrementa contador se clicar no logo
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 5) {
      toast.success('🌿 "Erva que cura, terra que cuida. Seu Zé te abençoa!"', 'BÊNÇÃO DO ZÉ');
      setClickCount(0);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand} style={{ cursor: 'pointer' }} onClick={handleLogoClick}>
          <div className={styles.logo}>LZ</div>
          <div>
            <h1 className={styles.title}>Lojinha do Zé</h1>
            <span className={styles.subtitle}>Produtos fitoterápicos e naturais</span>
          </div>
        </div>

        <div className={styles.search}>
          <FiSearch className={styles.searchIcon} />
          <input
            aria-label="Buscar produto"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value) {
                setActiveCategory('');
              }
            }}
          />
          {search && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
            >
              <FiX />
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={() => setCartOpen(true)}
            title="Abrir carrinho"
          >
            <FiShoppingCart />
            {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
          </button>

          <button
            type="button"
            className={styles.portal}
            onClick={onPortalClick}
            title={portalLabel}
          >
            <PortalIcon />
            <span className={styles.portalLabel}>{portalLabel}</span>
          </button>

          {onLogout ? (
            <button
              type="button"
              className={`${styles.portal} ${styles.logout}`}
              onClick={onLogout}
              title="Sair"
              aria-label="Sair"
            >
              <FiLogOut />
              <span className={styles.portalLabel}>Sair</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
