# Maximum Intensity Audit - 2026-04-12

## Performance & Scalability Audit

### Findings

- **PERF-01: N+1 Queries in Order Creation**
  - **Location**: `backend/src/routes/catalog.ts` -> `POST /orders`
  - **Description**: The endpoint performs a separate `SELECT ... FOR UPDATE` query for each item in the order to verify stock and lock the row.
  - **Impact**: High latency for large orders and increased database load.
  - **Recommendation**: Fetch all required products in a single query using `WHERE id = ANY($1) FOR UPDATE`.

- **PERF-02: N+1 Queries in Order Stock Restoration**
  - **Location**: `backend/src/routes/orders.ts` -> `restoreOrderStock()`
  - **Description**: When an order is canceled or deleted, the system loops through all items and performs an `UPDATE` on products and an `INSERT` into `inventory_log` for each.
  - **Impact**: Performance degradation during order cancellation/deletion of large orders.
  - **Recommendation**: Use bulk updates via `unnest` for products and a single bulk `INSERT` for the inventory log.

- **PERF-03: Potential Missing Index for Product Sorting**
  - **Location**: `backend/src/routes/products.ts` -> `GET /`
  - **Description**: The query `SELECT ... FROM products ORDER BY name` may not utilize the `idx_products_active_name` index because the `WHERE is_active = TRUE` clause is missing.
  - **Impact**: Potential full table scan and sort as the product catalog grows.
  - **Recommendation**: Either add a general index on `products(name)` or ensure the query filters by `is_active = TRUE` if applicable.
