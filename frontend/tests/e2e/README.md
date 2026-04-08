# Testes E2E (Playwright)

Este diretório está reservado para testes end-to-end com Playwright.

## Setup

```bash
# Instalar Playwright
npm install -D @playwright/test
npx playwright install

# Rodar testes
npx playwright test

# Rodar com UI
npx playwright test --ui
```

## Estrutura Sugerida

```
tests/e2e/
├── auth.spec.ts       # Login/logout
├── dashboard.spec.ts  # Painel admin
├── store.spec.ts      # Loja (catálogo, pedidos)
└── fixtures.ts        # Fixtures compartilhadas
```

## Exemplo de Teste

```typescript
import { test, expect } from '@playwright/test';

test('deve fazer login com sucesso', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@lojinha.com');
  await page.fill('[name="password"]', 'Admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/dashboard');
});
```
