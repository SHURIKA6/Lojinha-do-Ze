import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@lojinha.com';
const ADMIN_PASSWORD = 'Admin123';

// Teste de Login com sucesso
test('deve fazer login com sucesso', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');
});

// Teste de Logout
test('deve fazer logout com sucesso', async ({ page }) => {
  // Primeiro faz o login
  await page.goto('/login');
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');

  // Depois faz o logout
  await page.click('button#logout');
  await expect(page).toHaveURL('/login');
});