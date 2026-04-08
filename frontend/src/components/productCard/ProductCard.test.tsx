import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from './ProductCard';

jest.mock('@/components/ui/AppImage', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} data-testid="app-image" />,
}));

jest.mock('@/lib/api', () => ({
  formatCurrency: (value: number) => `R$ ${Number(value).toFixed(2)}`,
  getImageUrl: (value: string) => value,
}));

jest.mock('react-icons/fi', () => ({
  FiPackage: () => <div data-testid="fi-package" />,
  FiPlus: () => <div data-testid="fi-plus" />,
}));

const product = {
  id: '1',
  name: 'Erva Doce',
  description: 'Calmante natural',
  photo: '/erva.jpg',
  category: 'Chás e Infusões',
  sale_price: 10,
};

describe('ProductCard', () => {
  it('separa as ações de detalhes e adicionar ao carrinho', () => {
    const onOpen = jest.fn();
    const onQuickAdd = jest.fn();

    render(
      <ProductCard
        product={product as any}
        cartItem={null}
        availableStock={3}
        onOpen={onOpen}
        onQuickAdd={onQuickAdd}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ver detalhes de erva doce/i }));
    expect(onOpen).toHaveBeenCalledWith(product);

    fireEvent.click(screen.getByRole('button', { name: /adicionar erva doce/i }));
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('mantém o botão de detalhes acessível por teclado', async () => {
    const user = userEvent.setup();

    render(
      <ProductCard
        product={product as any}
        cartItem={null}
        availableStock={3}
        onOpen={jest.fn()}
        onQuickAdd={jest.fn()}
      />
    );

    await user.tab();
    expect(screen.getByRole('button', { name: /ver detalhes de erva doce/i })).toHaveFocus();
  });
});
