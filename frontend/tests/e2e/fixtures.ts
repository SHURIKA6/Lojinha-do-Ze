import { test } from '@playwright/test';

// Fixture para autenticação
export const loginAdmin = async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@lojinha.com');
  await page.fill('[name="password"]', 'Admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');
};

// Fixture para logout
export const logout = async ({ page }) => {
  await page.click('button#logout');
  await expect(page).toHaveURL('/login');
};