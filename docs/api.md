# API Specification - Lojinha do Zé

This document provides a comprehensive reference for the API endpoints of the Lojinha do Zé e-commerce system.

## Base URL
`/api`

---

## 🔐 Authentication & Session
All endpoints in this section are public unless specified otherwise.

### `POST /auth/login`
Authenticates a user and creates a session.
- **Request Payload:** `loginSchema`
  - `identifier`: (optional) Phone number
  - `email`: (optional) E-mail address
  - `password`: (required) User password
- **Response:** `{ user: { id, role }, csrfToken, easterEgg? }`

### `POST /auth/logout`
Destroys the current user session.
- **Response:** `{ message: "Logout realizado com sucesso" }`

### `GET /auth/me`
Returns data for the currently authenticated user.
- **Response:** `{ user, csrfToken }`

### `POST /auth/refresh-csrf`
Updates the CSRF token for the current session.
- **Auth Required:** Yes
- **Response:** `{ csrfToken }`

---

## 🛍️ Catalog (Public)
Endpoints for browsing the product catalog.

### `GET /catalog`
Retrieves the list of available products grouped by category.
- **Query Parameters:**
  - `limit`: Number of items per page (default: 20, max: 100)
  - `offset`: Pagination offset (default: 0)
  - `search`: Search term for product name
  - `category`: Filter by category name
- **Response:** `{ categories: Array<{ name, products: Array<Product> }>, total, limit, offset }`

### `POST /catalog/orders`
Creates a new customer order.
- **Request Payload:** `orderCreateSchema`
  - `customer_name`: Name of the customer
  - `customer_phone`: Phone number
  - `notes`: Optional order notes
  - `delivery_type`: 'entrega' or 'retirada'
  - `address`: Delivery address (required if `delivery_type` is 'entrega')
  - `payment_method`: Payment method (e.g., 'pix', 'cartao', 'dinheiro')
  - `items`: Array of `{ productId, quantity }`
- **Response:** `{ order: Order, message }` (Status: 201)

---

## 👥 Customer Management (Admin Only)
Endpoints for managing customer accounts.

### `GET /customers`
Lists all registered customers and guest customers from orders.
- **Query Parameters:**
  - `limit`: Pagination limit
  - `offset`: Pagination offset
- **Response:** `Array<Customer>`

### `GET /customers/:id`
Retrieves detailed information and spending statistics for a specific customer.
- **Response:** `{ ...Customer, total_spent, order_count }`

### `GET /customers/:id/orders`
Retrieves the order history for a specific customer.
- **Response:** `Array<Order>`

### `POST /customers`
Creates a new customer account and generates a password setup invite.
- **Request Payload:** `customerCreateSchema`
- **Response:** `{ ...Customer, invite }` (Status: 201)

### `PUT /customers/:id`
Updates customer information.
- **Request Payload:** `customerUpdateSchema` (Partial)
- **Response:** `Customer`

### `POST /customers/:id/invite`
Generates a new password setup invite for the customer.
- **Response:** `{ ...Customer, invite }`

### `PATCH /customers/:id/reset-password`
Resets customer password by generating a new invite.
- **Response:** `{ ...Customer, invite }`

### `PATCH /customers/:id/role`
Updates the user role (e.g., promoting a customer to admin).
- **Request Payload:** `{ role: 'admin' | 'customer', password: string }` (Admin password required for confirmation)
- **Response:** `{ id, name, role }`

### `DELETE /customers/:id`
Removes a customer account.
- **Request Payload:** `{ password: string }` (Admin password required for confirmation)
- **Response:** `{ message: "Usuário excluído" }`

---

## 📦 Product Management (Admin Only)
Endpoints for managing the product inventory.

### `GET /products`
Lists all products in the inventory.
- **Query Parameters:**
  - `limit`: Pagination limit
  - `offset`: Pagination offset
- **Response:** `Array<Product>`

### `GET /products/:id`
Retrieves detailed information for a specific product.
- **Response:** `Product`

### `POST /products`
Creates a new product.
- **Request Payload:** `productCreateSchema`
- **Response:** `Product` (Status: 201)

### `PUT /products/:id`
Updates an existing product.
- **Request Payload:** `productUpdateSchema` (Partial)
- **Response:** `Product`

### `DELETE /products/:id`
Deletes a product from the inventory.
- **Response:** `{ message: "Produto excluído" }`

---

## 📝 Order Management
Endpoints for processing and tracking orders.

### `GET /orders`
Lists orders. Customers see only their own orders; admins see all.
- **Query Parameters:**
  - `status`: Filter by order status (e.g., 'novo', 'concluido', 'cancelado')
  - `limit`: Pagination limit
  - `offset`: Pagination offset
- **Auth Required:** Yes
- **Response:** `Array<Order>`

### `PATCH /orders/:id/status`
Updates the status of an order (Admin Only).
- **Request Payload:** `orderStatusSchema` (`{ status: OrderStatus }`)
- **Response:** `Order`

### `DELETE /orders/:id`
Deletes an order (Admin Only).
- **Response:** `{ message: "Pedido excluído" }`

---

## 💳 Payments
Endpoints for processing payments.

### `POST /payments/pix`
Creates a Pix payment for a specific order.
- **Request Payload:** `pixPaymentSchema`
  - `orderId`: Order ID
  - `email`: Payer email
  - `phone`: Payer phone
  - `firstName`: Payer first name
  - `lastName`: Payer last name
  - `identificationNumber`: CPF/CNPJ
- **Response:** `PaymentObject` (from Mercado Pago) (Status: 201)

### `GET /payments/pix/:id`
Checks the status of a specific Pix payment.
- **Query Parameters:**
  - `orderId`: Order ID
  - `phone`: Payer phone for verification
- **Response:** `{ id, status, status_detail, external_reference }`

### `POST /payments/webhook`
Mercado Pago webhook for payment notifications.
- **Payload:** Webhook event data
- **Response:** `OK` (Status: 200)

---

## 📊 Dashboard & Analytics (Admin Only)
Endpoints for business intelligence and store monitoring.

### `GET /dashboard`
Retrieves key performance indicators and chart data for the current month.
- **Response:** `{ monthRevenue, monthExpenses, profit, activeOrders, totalSales, lowStock, recentOrders, chartData, categoryChart }`

### `GET /analytics/forecast`
Generates demand forecasts for products based on historical data.
- **Response:** `{ forecasts: Array<{ id, name, currentStock, movingAverage, regression, seasonality }> }`

### `GET /analytics/bi/sentiment`
Analyzes sentiment of customer reviews.
- **Response:** `{ sentimentAnalysis: Array }`

### `GET /admin/chat`
Chat interface with the "Guardião da Lojinha" AI assistant.
- **Request Payload:** `{ message: string }`
- **Response:** `{ reply: string }`

---

## 📈 Reports (Admin Only)
Endpoints for generating and exporting business reports.

### `GET /reports/:type`
Retrieves data for a specific report type.
- **Path Parameters:**
  - `type`: 'vendas', 'estoque', 'clientes', 'financeiro', or 'inadimplencia'
- **Query Parameters:**
  - `limit`: Pagination limit
  - `offset`: Pagination offset
- **Response:** Varies by report type.

### `POST /reports/export/csv`
Exports a report to a CSV file.
- **Request Payload:** `{ reportType: 'vendas' | 'estoque' }`
- **Response:** CSV File

---

## 💰 Financial Transactions (Admin Only)
Endpoints for recording and managing store expenses and revenues.

### `GET /transactions`
Lists all financial transactions.
- **Query Parameters:**
  - `type`: Filter by 'receita' (income) or 'despesa' (expense)
  - `limit`: Pagination limit
  - `offset`: Pagination offset
- **Response:** `Array<Transaction>`

### `POST /transactions`
Records a new financial transaction.
- **Request Payload:** `transactionCreateSchema`
  - `type`: 'receita' or 'despesa'
  - `category`: Transaction category
  - `description`: Transaction description
  - `value`: Amount
  - `date`: Optional date
- **Response:** `Transaction` (Status: 201)

### `DELETE /transactions/:id`
Removes a financial transaction.
- **Response:** `{ message: "Transação excluída" }`

---

## 👤 User Profile
Endpoints for managing the authenticated user's profile.

### `PUT /profile`
Updates the profile information for the currently authenticated user.
- **Auth Required:** Yes
- **Request Payload:** `profileUpdateSchema` (Partial)
- **Response:** `User`

---

## 📤 File Uploads
Endpoints for handling image uploads.

### `POST /upload`
Uploads an image to the store's storage (Admin Only).
- **Request Payload:** Multipart form data (`file` field)
- **Response:** `{ url, message }` (Status: 201)

### `GET /upload/products/:filename`
Serves an uploaded product image.
- **Path Parameters:**
  - `filename`: The name of the file in the bucket.
- **Response:** Image File

---

## 🩺 System Health
Public endpoint for monitoring API health.

### `GET /health`
Returns the status of the API and its dependencies.
- **Response:** `{ status, message, timestamp, checks? }`
