# Remediation Implementation Plan - Lojinha do Zé

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate all critical and high-priority findings from the Maximum Intensity Audit (MIA), transitioning the system to a robust, documented, and scalable architecture.

**Architecture:** Transition from "Fat Routes" to a Domain-Driven Design (DDD) inspired layer separation: Route $\rightarrow$ Service $\rightarrow$ Repository. This isolates business logic, ensures transaction atomicity at the service level, and simplifies testing.

**Tech Stack:** Hono, Zod, Neon (PostgreSQL), TypeScript.

---

## File Mapping

### Documentation
- Create: `README.md` (Project root)
- Create: `docs/architecture.md` (System design & layer specs)
- Create: `docs/api.md` (API endpoint definitions)

### Architecture (Refactor)
- Create: `backend/src/repositories/productRepository.ts`
- Create: `backend/src/repositories/orderRepository.ts`
- Create: `backend/src/repositories/customerRepository.ts`
- Create: `backend/src/services/productService.ts`
- Create: `backend/src/services/orderService.ts`
- Create: `backend/src/services/customerService.ts`
- Modify: `backend/src/routes/products.ts` (Thin out)
- Modify: `backend/src/routes/orders.ts` (Thin out)
- Modify: `backend/src/routes/customers.ts` (Thin out)

### Performance
- Modify: `backend/src/repositories/orderRepository.ts` (Implement bulk fetch/update)
- Modify: `backend/src/services/orderService.ts` (Use bulk methods)

### Security & Polishing
- Modify: `backend/src/routes/auth.ts` (Add Zod validators)
- Modify: `backend/src/types/index.ts` (Replace `any` with specific interfaces)
- Modify: `backend/src/migrations/` (Add UUID columns to orders/payments)
- Modify: `backend/src/repositories/*.ts` (Update queries to use UUIDs)

---

## Implementation Tasks

### Phase 1: Documentation

#### Task 1: Project Root README
**Files:**
- Create: `README.md`

- [ ] **Step 1: Write comprehensive README**
  Include: Project overview, tech stack, local setup instructions (env, db seed), deployment guide (Cloudflare Workers), and project structure.
- [ ] **Step 2: Commit**
  `git add README.md && git commit -m "docs: add project root README"`

#### Task 2: System Architecture Documentation
**Files:**
- Create: `docs/architecture.md`

- [ ] **Step 1: Document the new Layered Architecture**
  Explain the Route $\rightarrow$ Service $\rightarrow$ Repository flow. Define the responsibility of each layer.
- [ ] **Step 2: Commit**
  `git add docs/architecture.md && git commit -m "docs: add architecture documentation"`

#### Task 3: API Specification
**Files:**
- Create: `docs/api.md`

- [ ] **Step 1: Document all existing endpoints**
  List endpoints, methods, request payloads (Zod schemas), and response formats.
- [ ] **Step 2: Commit**
  `git add docs/api.md && git commit -m "docs: add API specification"`

---

### Phase 2: Architecture Refactor

#### Task 4: Product Layer Implementation
**Files:**
- Create: `backend/src/repositories/productRepository.ts`
- Create: `backend/src/services/productService.ts`
- Modify: `backend/src/routes/products.ts`

- [ ] **Step 1: Implement `ProductRepository`**
  Move all raw SQL queries from `routes/products.ts` to this class.
- [ ] **Step 2: Implement `ProductService`**
  Move business logic (e.g., transaction creation on stock increase) from routes to this service. Handle transaction boundaries (`BEGIN/COMMIT`) here.
- [ ] **Step 3: Refactor `routes/products.ts`**
  Inject `productService` and call its methods. Remove all DB logic and transaction handling.
- [ ] **Step 4: Verify functionality**
  Run tests or manual check for CRUD operations.
- [ ] **Step 5: Commit**
  `git add . && git commit -m "arch: refactor products to Route-Service-Repository pattern"`

#### Task 5: Order Layer Implementation
**Files:**
- Create: `backend/src/repositories/orderRepository.ts`
- Create: `backend/src/services/orderService.ts`
- Modify: `backend/src/routes/orders.ts`

- [ ] **Step 1: Implement `OrderRepository`**
  Move all order-related SQL queries to this class.
- [ ] **Step 2: Implement `OrderService`**
  Move core business logic (order validation, stock checking, Mercado Pago integration) here.
- [ ] **Step 3: Refactor `routes/orders.ts`**
  Convert to thin handlers calling `orderService`.
- [ ] **Step 4: Verify functionality**
  Verify order creation and payment flows.
- [ ] **Step 5: Commit**
  `git add . && git commit -m "arch: refactor orders to Route-Service-Repository pattern"`

#### Task 6: Customer Layer Implementation
**Files:**
- Create: `backend/src/repositories/customerRepository.ts`
- Create: `backend/src/services/customerService.ts`
- Modify: `backend/src/routes/customers.ts`

- [ ] **Step 1: Implement `CustomerRepository`**
  Move customer SQL queries here.
- [ ] **Step 2: Implement `CustomerService`**
  Move customer business logic here.
- [ ] **Step 3: Refactor `routes/customers.ts`**
  Convert to thin handlers.
- [ ] **Step 4: Commit**
  `git add . && git commit -m "arch: refactor customers to Route-Service-Repository pattern"`

---

### Phase 3: Performance Optimization

#### Task 7: Optimize Order Creation (PERF-01)
**Files:**
- Modify: `backend/src/repositories/orderRepository.ts`
- Modify: `backend/src/services/orderService.ts`

- [ ] **Step 1: Implement Bulk Product Fetch**
  In `OrderRepository`, replace loop-based fetches with a single query using `WHERE id = ANY($1)`.
- [ ] **Step 2: Update `OrderService`**
  Ensure it passes the list of IDs to the repository in one call.
- [ ] **Step 3: Verify performance improvement**
  Log query counts during order creation.
- [ ] **Step 4: Commit**
  `git add . && git commit -m "perf: remove N+1 queries in order creation"`

#### Task 8: Optimize Stock Restoration (PERF-02)
**Files:**
- Modify: `backend/src/repositories/orderRepository.ts`
- Modify: `backend/src/services/orderService.ts`

- [ ] **Step 1: Implement Bulk Stock Update**
  Use `unnest` or temporary tables to perform bulk updates of product quantities in a single query.
- [ ] **Step 2: Update `OrderService`**
  Pass all item updates to the repository in one batch.
- [ ] **Step 3: Commit**
  `git add . && git commit -m "perf: remove N+1 queries in stock restoration"`

---

### Phase 4: Security & Polishing

#### Task 9: Auth Route Validation (SEC-01)
**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Create Login Schema**
  Define a Zod schema for login requests in `backend/src/domain/schemas.ts`.
- [ ] **Step 2: Apply `zValidator`**
  Add the validator to the login route in `auth.ts`.
- [ ] **Step 3: Commit**
  `git add . && git commit -m "sec: implement Zod validation for auth routes"`

#### Task 10: Type Safety Cleanup (ARCH-05)
**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `backend/src/services/*.ts`
- Modify: `backend/src/repositories/*.ts`

- [ ] **Step 1: Define Domain Interfaces**
  Replace `any` in service and repository methods with proper interfaces (e.g., `Product`, `Order`, `Customer`).
- [ ] **Step 2: Fix Type Errors**
  Update all callsites to align with new types.
- [ ] **Step 3: Commit**
  `git add . && git commit -m "refactor: eliminate 'any' types in core logic"`

#### Task 11: Public ID Transition (TEST-02)
**Files:**
- Create: `backend/src/migrations/009_add_uuid_identifiers.ts`
- Modify: `backend/src/repositories/*.ts`

- [ ] **Step 1: Create UUID Migration**
  Add `public_id` (UUID) columns to `orders` and `payments` tables. Populate them for existing records.
- [ ] **Step 2: Update Repositories**
  Modify queries to search by `public_id` for public-facing endpoints.
- [ ] **Step 3: Update Routes**
  Ensure routes return and accept `public_id` instead of internal integer IDs.
- [ ] **Step 4: Commit**
  `git add . && git commit -m "sec: transition public identifiers to UUIDs"`
