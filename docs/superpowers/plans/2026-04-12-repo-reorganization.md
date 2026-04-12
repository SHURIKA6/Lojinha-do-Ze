# Repository Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the repository structure into a professional monorepo with a module-based backend and feature-based frontend.

**Architecture:** 
- Root: npm workspaces for `backend` and `frontend`.
- Backend: Transition from layered to module-based architecture (`src/core` + `src/modules/[domain]`).
- Frontend: Consolidate shared logic into `src/core` and refine `src/features`.

**Tech Stack:** Node.js, TypeScript, Hono (backend), Next.js (frontend), npm workspaces.

---

## Phase 1: Root Setup & Cleanup

### Task 1: Initialize Root Workspace
**Files:**
- Create: `package.json`

- [ ] **Step 1: Create root package.json**
```json
{
  "name": "lojinha-do-ze",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ]
}
```

- [ ] **Step 2: Commit**
```bash
git add package.json
git commit -m "chore: initialize root npm workspaces"
```

### Task 2: Asset & Config Cleanup
**Files:**
- Create: `assets/fotos-produtos/`
- Create: `.env.example`
- Modify: `backend/env.example` (Delete)

- [ ] **Step 1: Move product photos**
```bash
mkdir -p assets/fotos-produtos
mv "Fotos Produtos"/* assets/fotos-produtos/
rmdir "Fotos Produtos"
```

- [ ] **Step 2: Create unified .env.example**
```bash
cat <<'EOF' > .env.example
# Root Environment Example
# Backend
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=secret
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
```

- [ ] **Step 3: Remove redundant backend env example**
```bash
rm backend/env.example
```

- [ ] **Step 4: Commit**
```bash
git add assets/ .env.example
git rm backend/env.example
git commit -m "chore: reorganize root assets and unify env examples"
```

---

## Phase 2: Backend Core Setup

### Task 3: Create Backend Core Structure
**Files:**
- Create: `backend/src/core/`
- Move: `backend/src/db.ts` $\rightarrow$ `backend/src/core/db.ts`
- Move: `backend/src/load-local-env.ts` $\rightarrow$ `backend/src/core/load-local-env.ts`

- [ ] **Step 1: Create core directory**
```bash
mkdir -p backend/src/core
```

- [ ] **Step 2: Move global files**
```bash
mv backend/src/db.ts backend/src/core/db.ts
mv backend/src/load-local-env.ts backend/src/core/load-local-env.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/core
git commit -m "refactor: setup backend core structure"
```

---

## Phase 3: Backend Module Migration

Each module follows the pattern: `routes.ts`, `service.ts`, `repository.ts`.

### Task 4: Auth Module Migration
**Files:**
- Create: `backend/src/modules/auth/`
- Move: `backend/src/routes/auth.ts` $\rightarrow$ `backend/src/modules/auth/routes.ts`
- Move: `backend/src/services/authService.ts` $\rightarrow$ `backend/src/modules/auth/service.ts`
- Move: `backend/src/services/refreshTokenService.ts` $\rightarrow$ `backend/src/modules/auth/refreshTokenService.ts`
- Move: `backend/src/repositories/sessionRepository.ts` $\rightarrow$ `backend/src/modules/auth/repository.ts`
- Move: `backend/src/repositories/passwordSetupRepository.ts` $\rightarrow$ `backend/src/modules/auth/passwordSetupRepository.ts`

- [ ] **Step 1: Create auth module folder**
```bash
mkdir -p backend/src/modules/auth
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/auth.ts backend/src/modules/auth/routes.ts
mv backend/src/services/authService.ts backend/src/modules/auth/service.ts
mv backend/src/services/refreshTokenService.ts backend/src/modules/auth/refreshTokenService.ts
mv backend/src/repositories/sessionRepository.ts backend/src/modules/auth/repository.ts
mv backend/src/repositories/passwordSetupRepository.ts backend/src/modules/auth/passwordSetupRepository.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/auth
git commit -m "refactor: migrate auth to module-based structure"
```

### Task 5: Product/Catalog Module Migration
**Files:**
- Create: `backend/src/modules/products/`
- Move: `backend/src/routes/products.ts` $\rightarrow$ `backend/src/modules/products/routes.ts`
- Move: `backend/src/routes/catalog.ts` $\rightarrow$ `backend/src/modules/products/catalogRoutes.ts`
- Move: `backend/src/services/productService.ts` $\rightarrow$ `backend/src/modules/products/service.ts`
- Move: `backend/src/repositories/productRepository.ts` $\rightarrow$ `backend/src/modules/products/repository.ts`

- [ ] **Step 1: Create products module folder**
```bash
mkdir -p backend/src/modules/products
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/products.ts backend/src/modules/products/routes.ts
mv backend/src/routes/catalog.ts backend/src/modules/products/catalogRoutes.ts
mv backend/src/services/productService.ts backend/src/modules/products/service.ts
mv backend/src/repositories/productRepository.ts backend/src/modules/products/repository.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/products
git commit -m "refactor: migrate products to module-based structure"
```

### Task 6: Customer Module Migration
**Files:**
- Create: `backend/src/modules/customers/`
- Move: `backend/src/routes/customers.ts` $\rightarrow$ `backend/src/modules/customers/routes.ts`
- Move: `backend/src/routes/profile.ts` $\rightarrow$ `backend/src/modules/customers/profileRoutes.ts`
- Move: `backend/src/services/customerService.ts` $\rightarrow$ `backend/src/modules/customers/service.ts`
- Move: `backend/src/repositories/customerRepository.ts` $\rightarrow$ `backend/src/modules/customers/repository.ts`
- Move: `backend/src/repositories/userRepository.ts` $\rightarrow$ `backend/src/modules/customers/userRepository.ts`

- [ ] **Step 1: Create customers module folder**
```bash
mkdir -p backend/src/modules/customers
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/customers.ts backend/src/modules/customers/routes.ts
mv backend/src/routes/profile.ts backend/src/modules/customers/profileRoutes.ts
mv backend/src/services/customerService.ts backend/src/modules/customers/service.ts
mv backend/src/repositories/customerRepository.ts backend/src/modules/customers/repository.ts
mv backend/src/repositories/userRepository.ts backend/src/modules/customers/userRepository.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/customers
git commit -m "refactor: migrate customers to module-based structure"
```

### Task 7: Order Module Migration
**Files:**
- Create: `backend/src/modules/orders/`
- Move: `backend/src/routes/orders.ts` $\rightarrow$ `backend/src/modules/orders/routes.ts`
- Move: `backend/src/services/orderService.ts` $\rightarrow$ `backend/src/modules/orders/service.ts`
- Move: `backend/src/repositories/orderRepository.ts` $\rightarrow$ `backend/src/modules/orders/repository.ts`

- [ ] **Step 1: Create orders module folder**
```bash
mkdir -p backend/src/modules/orders
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/orders.ts backend/src/modules/orders/routes.ts
mv backend/src/services/orderService.ts backend/src/modules/orders/service.ts
mv backend/src/repositories/orderRepository.ts backend/src/modules/orders/repository.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/orders
git commit -m "refactor: migrate orders to module-based structure"
```

### Task 8: Payment Module Migration
**Files:**
- Create: `backend/src/modules/payments/`
- Move: `backend/src/routes/payments.ts` $\rightarrow$ `backend/src/modules/payments/routes.ts`
- Move: `backend/src/routes/transactions.ts` $\rightarrow$ `backend/src/modules/payments/transactionsRoutes.ts`
- Move: `backend/src/services/mercadoPagoService.ts` $\rightarrow$ `backend/src/modules/payments/service.ts`

- [ ] **Step 1: Create payments module folder**
```bash
mkdir -p backend/src/modules/payments
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/payments.ts backend/src/modules/payments/routes.ts
mv backend/src/routes/transactions.ts backend/src/modules/payments/transactionsRoutes.ts
mv backend/src/services/mercadoPagoService.ts backend/src/modules/payments/service.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/payments
git commit -m "refactor: migrate payments to module-based structure"
```

### Task 9: Analytics Module Migration
**Files:**
- Create: `backend/src/modules/analytics/`
- Move: `backend/src/routes/analytics.ts` $\rightarrow$ `backend/src/modules/analytics/routes.ts`
- Move: `backend/src/routes/dashboard.ts` $\rightarrow$ `backend/src/modules/analytics/dashboardRoutes.ts`
- Move: `backend/src/routes/reports.ts` $\rightarrow$ `backend/src/modules/analytics/reportsRoutes.ts`
- Move: `backend/src/services/businessIntelligenceService.ts` $\rightarrow$ `backend/src/modules/analytics/biService.ts`
- Move: `backend/src/services/customerBehaviorService.ts` $\rightarrow$ `backend/src/modules/analytics/behaviorService.ts`
- Move: `backend/src/services/demandForecastService.ts` $\rightarrow$ `backend/src/modules/analytics/forecastService.ts`

- [ ] **Step 1: Create analytics module folder**
```bash
mkdir -p backend/src/modules/analytics
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/analytics.ts backend/src/modules/analytics/routes.ts
mv backend/src/routes/dashboard.ts backend/src/modules/analytics/dashboardRoutes.ts
mv backend/src/routes/reports.ts backend/src/modules/analytics/reportsRoutes.ts
mv backend/src/services/businessIntelligenceService.ts backend/src/modules/analytics/biService.ts
mv backend/src/services/customerBehaviorService.ts backend/src/modules/analytics/behaviorService.ts
mv backend/src/services/demandForecastService.ts backend/src/modules/analytics/forecastService.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/analytics
git commit -m "refactor: migrate analytics to module-based structure"
```

### Task 10: System/Core Module Migration
**Files:**
- Create: `backend/src/modules/system/`
- Move: `backend/src/routes/upload.ts` $\rightarrow$ `backend/src/modules/system/uploadRoutes.ts`
- Move: `backend/src/routes/ai.ts` $\rightarrow$ `backend/src/modules/system/aiRoutes.ts`
- Move: `backend/src/services/cacheService.ts` $\rightarrow$ `backend/src/modules/system/cacheService.ts`
- Move: `backend/src/services/notificationService.ts` $\rightarrow$ `backend/src/modules/system/notificationService.ts`
- Move: `backend/src/services/permissionService.ts` $\rightarrow$ `backend/src/modules/system/permissionService.ts`
- Move: `backend/src/services/supplierService.ts` $\rightarrow$ `backend/src/modules/system/supplierService.ts`

- [ ] **Step 1: Create system module folder**
```bash
mkdir -p backend/src/modules/system
```

- [ ] **Step 2: Move files**
```bash
mv backend/src/routes/upload.ts backend/src/modules/system/uploadRoutes.ts
mv backend/src/routes/ai.ts backend/src/modules/system/aiRoutes.ts
mv backend/src/services/cacheService.ts backend/src/modules/system/cacheService.ts
mv backend/src/services/notificationService.ts backend/src/modules/system/notificationService.ts
mv backend/src/services/permissionService.ts backend/src/modules/system/permissionService.ts
mv backend/src/services/supplierService.ts backend/src/modules/system/supplierService.ts
```

- [ ] **Step 3: Commit**
```bash
git add backend/src/modules/system
git commit -m "refactor: migrate system services to module-based structure"
```

---

## Phase 4: Backend Integration & Cleanup

### Task 11: Update Server Entry Point
**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Update imports and route mounting**
The agent will need to update `server.ts` to import routes from the new module paths instead of the `src/routes` directory.

- [ ] **Step 2: Commit**
```bash
git add backend/src/server.ts
git commit -m "refactor: update server.ts to use module-based routes"
```

### Task 12: Remove Empty Backend Directories
**Files:**
- Delete: `backend/src/routes/`
- Delete: `backend/src/services/`
- Delete: `backend/src/repositories/`

- [ ] **Step 1: Remove old directories**
```bash
rmdir backend/src/routes backend/src/services backend/src/repositories
```

- [ ] **Step 2: Commit**
```bash
git add .
git commit -m "chore: remove empty legacy backend directories"
```

---

## Phase 5: Frontend Core Consolidation

### Task 13: Setup Frontend Core
**Files:**
- Create: `frontend/src/core/`
- Create: `frontend/src/core/api/`
- Create: `frontend/src/core/hooks/`
- Create: `frontend/src/core/utils/`
- Create: `frontend/src/core/services/`
- Create: `frontend/src/core/lib/`

- [ ] **Step 1: Create core structure**
```bash
mkdir -p frontend/src/core/api frontend/src/core/hooks frontend/src/core/utils frontend/src/core/services frontend/src/core/lib
```

- [ ] **Step 2: Consolidate API logic**
Move `frontend/src/lib/api` and `frontend/src/services/api` into `frontend/src/core/api`.

- [ ] **Step 3: Consolidate Utils**
Move `frontend/src/utils/formatting.ts` and `frontend/src/lib/api/formatting.ts` into `frontend/src/core/utils/formatting.ts`.

- [ ] **Step 4: Move global hooks**
Move `frontend/src/hooks/useToast.tsx` $\rightarrow$ `frontend/src/core/hooks/useToast.tsx`.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/core
git commit -m "refactor: consolidate frontend shared logic into src/core"
```

### Task 14: Frontend Cleanup
**Files:**
- Delete: `frontend/src/lib/`
- Delete: `frontend/src/services/api/`
- Delete: `frontend/src/utils/`

- [ ] **Step 1: Remove legacy directories**
```bash
rm -rf frontend/src/lib frontend/src/services/api frontend/src/utils
```

- [ ] **Step 2: Commit**
```bash
git add .
git commit -m "chore: remove legacy frontend directories"
```

---

## Phase 6: Final Verification

### Task 15: Run Tests and Verify
- [ ] **Step 1: Run backend tests**
Run: `cd backend && npm test`

- [ ] **Step 2: Run frontend tests**
Run: `cd frontend && npm test`

- [ ] **Step 3: Final commit and cleanup**
```bash
git add .
git commit -m "chore: final verification and cleanup after repo reorganization"
```
