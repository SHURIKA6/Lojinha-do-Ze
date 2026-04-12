# Maximum Intensity Audit (MIA) - 2026-04-12

## Findings Log

| ID | Category | Risk | Description | PoC/Code Snippet | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ARCH-01 | Layer Separation | Critical | Routes directly access the database, bypassing Service and Repository layers entirely. | `backend/src/routes/orders.ts`: `await db.query(...)` in route handlers. | Implement a strict Route $\rightarrow$ Service $\rightarrow$ Repository flow. Move all SQL to repositories. |
| ARCH-02 | Business Logic Leak | High | Critical business logic (e.g., stock restoration, transaction logging) is implemented in route handlers. | `backend/src/routes/orders.ts`: `restoreOrderStock` function and transaction logic inside `patch('/:id/status')`. | Move all business logic to the Service layer. |
| ARCH-03 | DTO Consistency | Medium | Standardized `ResponseDto` is implemented but ignored in routes, which return raw JSON. | `backend/src/routes/products.ts`: `return c.json(rows);` instead of using `ResponseHelpers`. | Enforce the use of `ResponseDto` and `ResponseHelpers` across all API endpoints. |
| ARCH-04 | Transaction Atomicity | High | External API calls (Mercado Pago) are performed inside local DB transactions without reliability patterns. | `backend/src/routes/orders.ts`: `mpService.cancelPayment` called between `BEGIN` and `COMMIT`. | Use the Outbox pattern or separate the external call from the DB transaction to avoid inconsistencies. |
| ARCH-05 | Type Safety | Medium | Excessive use of `any` in route handlers and helper functions, bypassing TypeScript's type checking. | `backend/src/routes/orders.ts`: `async function restoreOrderStock(client: any, order: any)`. | Replace `any` with proper interfaces/types from `backend/src/types` or domain schemas. |
| ARCH-06 | Transaction Management | Medium | DB transaction boundaries (`BEGIN/COMMIT`) are managed in the route layer, leaking infrastructure concerns. | `backend/src/routes/products.ts`: `await client.query('BEGIN');` inside the route handler. | Move transaction management to the Service layer or use a Unit of Work pattern. |
