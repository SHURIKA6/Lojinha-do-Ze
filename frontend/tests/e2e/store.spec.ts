import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@lojinha.com';
const ADMIN_PASSWORD = 'Admin123';

// Teste de navegação pelo catálogo
test('deve navegar pelo catálogo', async ({ page }) => {
  await page.goto('/');

  // Verifica se os produtos são exibidos
  await expect(page.locator('div.product-card')).toHaveCount({ min: 1 });

  // Clica em um produto para ver detalhes
  await page.click('div.product-card:first-child');
  await expect(page).toHaveURL(/\/product\/\d+/);
});

// Teste de criação de pedido
test('deve criar um pedido com sucesso', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');

  // Navega para o catálogo
  await page.goto('/catalog');

  // Adiciona um produto ao carrinho
  await page.click('button#add-to-cart:first-child');

  // Vai para o checkout
  await page.click('a[href="/checkout"]');

  // Preenche informações do pedido
  await page.fill('input[name="customerName"]', 'Teste Cliente');
  await page.fill('input[name="customerPhone"]', '1234567890');
  await page.fill('textarea[name="notes"]', 'Nota de teste');

  // Submete o pedido
  await page.click('button[type="submit"]');

  // Verifica se foi redirecionado para a página de confirmação
  await expect(page).toHaveURL('/order/confirmation');
});