import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import StorefrontNavbar from './StorefrontNavbar';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { jest } from '@jest/globals';

// Mock react-icons to avoid issues in tests
jest.mock('react-icons/fi', () => ({
  FiLogOut: () => <div data-testid="fi-logout" />,
  FiSearch: () => <div data-testid="fi-search" />,
  FiShoppingCart: () => <div data-testid="fi-shopping-cart" />,
  FiX: () => <div data-testid="fi-x" />,
}));

describe('StorefrontNavbar', () => {
  const defaultProps = {
    cartCount: 0,
    onLogout: jest.fn<any>(),
    onPortalClick: jest.fn<any>(),
    portalLabel: 'Portal',
    PortalIcon: () => <div data-testid="portal-icon" />,
    search: '',
    setActiveCategory: jest.fn<any>(),
    setCartOpen: jest.fn<any>(),
    setSearch: jest.fn<any>(),
  };

  it('renders the brand name', () => {
    renderWithProviders(<StorefrontNavbar {...defaultProps} />);
    expect(screen.getByText('Lojinha do Zé')).toBeInTheDocument();
  });

  it('displays the cart count when greater than 0', () => {
    renderWithProviders(<StorefrontNavbar {...defaultProps} cartCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls setSearch on input change', () => {
    renderWithProviders(<StorefrontNavbar {...defaultProps} />);
    const input = screen.getByLabelText('Buscar produto');
    fireEvent.change(input, { target: { value: 'lavanda' } });
    expect(defaultProps.setSearch).toHaveBeenCalledWith('lavanda');
  });

  it('calls onLogout when logout button is clicked', () => {
    renderWithProviders(<StorefrontNavbar {...defaultProps} />);
    const logoutBtn = screen.getByLabelText('Sair');
    fireEvent.click(logoutBtn);
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
