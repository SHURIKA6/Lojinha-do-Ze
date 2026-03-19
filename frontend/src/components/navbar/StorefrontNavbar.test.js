import { render, screen, fireEvent } from '@testing-library/react';
import StorefrontNavbar from './StorefrontNavbar';

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
    onLogout: jest.fn(),
    onPortalClick: jest.fn(),
    portalLabel: 'Portal',
    PortalIcon: () => <div data-testid="portal-icon" />,
    search: '',
    setActiveCategory: jest.fn(),
    setCartOpen: jest.fn(),
    setSearch: jest.fn(),
  };

  it('renders the brand name', () => {
    render(<StorefrontNavbar {...defaultProps} />);
    expect(screen.getByText('Lojinha do Zé')).toBeInTheDocument();
  });

  it('displays the cart count when greater than 0', () => {
    render(<StorefrontNavbar {...defaultProps} cartCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls setSearch on input change', () => {
    render(<StorefrontNavbar {...defaultProps} />);
    const input = screen.getByLabelText('Buscar produto');
    fireEvent.change(input, { target: { value: 'lavanda' } });
    expect(defaultProps.setSearch).toHaveBeenCalledWith('lavanda');
  });

  it('calls onLogout when logout button is clicked', () => {
    render(<StorefrontNavbar {...defaultProps} />);
    const logoutBtn = screen.getByLabelText('Sair');
    fireEvent.click(logoutBtn);
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
