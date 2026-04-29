import { test, expect } from '@playwright/test';

test.describe('Fluxo de Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Mock do catálogo para ter produtos previsíveis
    await page.route('**/api/catalog**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: '1',
              name: 'Produto Teste E2E',
              category: 'Fitoterápicos',
              sale_price: 50.0,
              quantity: 10,
              is_active: true,
              photo: null
            }
          ],
          categories: [{ name: 'Fitoterápicos', count: 1 }],
          hasMore: false
        })
      });
    });

    await page.goto('/');
  });

  test('deve adicionar um produto ao carrinho e completar o checkout como convidado', async ({ page }) => {
    // 1. Verificar se o produto está na tela
    await expect(page.getByText('Produto Teste E2E')).toBeVisible();

    // 2. Adicionar ao carrinho (botão Quick Add)
    await page.getByLabel('Adicionar Produto Teste E2E').click();

    // 3. Verificar se a barra do carrinho apareceu
    await expect(page.getByText('1 item')).toBeVisible();
    await expect(page.getByText('R$ 50,00')).toBeVisible();

    // 4. Abrir o carrinho
    await page.getByRole('button', { name: /Abrir carrinho/ }).click();

    // 5. Clicar em Finalizar Compra no Sidebar
    await page.getByRole('button', { name: 'Finalizar Compra' }).click();

    // 6. Preencher formulário de checkout
    await page.getByPlaceholder('Seu nome completo').fill('Cliente Teste Playwright');
    await page.getByPlaceholder('(00) 00000-0000').fill('11999999999');
    
    // Selecionar retirada para evitar busca de endereço por mapa em teste
    await page.getByLabel('Retirada no local').check();

    // 7. Selecionar método de pagamento (Dinheiro para ser síncrono no mock)
    await page.getByLabel('Dinheiro').check();

    // Mock do POST de pedido
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '999',
          total: 50.0,
          status: 'pendente',
          items: [{ name: 'Produto Teste E2E', quantity: 1 }]
        })
      });
    });

    // 8. Confirmar pedido
    await page.getByRole('button', { name: 'Confirmar Pedido' }).click();

    // 9. Verificar mensagem de sucesso
    await expect(page.getByText('Pedido Realizado!')).toBeVisible();
    await expect(page.getByText('#999')).toBeVisible();
  });
});
