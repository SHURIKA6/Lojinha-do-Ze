'use client';

import Link from 'next/link';
import { FiSearch, FiShoppingCart, FiX } from 'react-icons/fi';

export default function StorefrontNavbar({
  cartCount,
  onPortalClick,
  portalLabel,
  PortalIcon,
  search,
  setActiveCategory,
  setCartOpen,
  setSearch,
}) {
  return (
    <header className="loja-header">
      <div className="loja-header__inner">
        <Link href="/" className="loja-header__brand">
          <div className="loja-header__logo">LZ</div>
          <div>
            <h1 className="loja-header__title">Lojinha do Zé</h1>
            <span className="loja-header__subtitle">Produtos fitoterápicos e naturais</span>
          </div>
        </Link>

        <div className="loja-header__search">
          <FiSearch className="loja-header__search-icon" />
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
              className="loja-header__search-clear"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
            >
              <FiX />
            </button>
          )}
        </div>

        <div className="loja-header__actions">
          <button
            type="button"
            className="loja-header__cart-btn"
            onClick={() => setCartOpen(true)}
            title="Abrir carrinho"
          >
            <FiShoppingCart />
            {cartCount > 0 && <span className="loja-header__cart-badge">{cartCount}</span>}
          </button>

          <button
            type="button"
            className="loja-header__portal"
            onClick={onPortalClick}
            title={portalLabel}
          >
            <PortalIcon />
            <span className="loja-header__portal-label">{portalLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

