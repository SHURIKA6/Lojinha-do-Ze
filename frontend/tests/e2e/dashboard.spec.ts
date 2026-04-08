import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@lojinha.com';
const ADMIN_PASSWORD = 'Admin123';

// Teste de acesso ao painel admin
test('deve acessar o painel admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');

  // Verifica se os elementos do dashboard estão presentes
  await expect(page.locator('h1#dashboard-title')).toBeVisible();
  await expect(page.locator('table#orders-table')).toBeVisible();
});