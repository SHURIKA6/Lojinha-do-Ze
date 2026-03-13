'use client';

import { FiSearch, FiShoppingCart, FiX } from 'react-icons/fi';

export default function Header({ search, setSearch, setActiveCategory, cartCount, setCartOpen }) {
  return (
    <header className="loja-header">
      <div className="loja-header__inner">
        <div className="loja-header__brand">
          <div className="loja-header__logo">LZ</div>
          <div>
            <h1 className="loja-header__title">Lojinha do Zé</h1>
            <span className="loja-header__subtitle">Produtos Fitoterápicos e Naturais</span>
          </div>
        </div>
        <div className="loja-header__search">
          <FiSearch className="loja-header__search-icon" />
          <input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value) setActiveCategory('');
            }}
          />
          {search && (
            <button className="loja-header__search-clear" onClick={() => setSearch('')}>
              <FiX />
            </button>
          )}
        </div>
        <button className="loja-header__cart-btn" onClick={() => setCartOpen(true)}>
          <FiShoppingCart />
          {cartCount > 0 && <span className="loja-header__cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}