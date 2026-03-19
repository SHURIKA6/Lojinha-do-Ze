'use client';

import Link from 'next/link';
import { FiLogOut, FiSearch, FiShoppingCart, FiX } from 'react-icons/fi';
import styles from './StorefrontNavbar.module.css';

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
}) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <div className={styles.logo}>LZ</div>
          <div>
            <h1 className={styles.title}>Lojinha do Zé</h1>
            <span className={styles.subtitle}>Produtos fitoterápicos e naturais</span>
          </div>
        </Link>

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
