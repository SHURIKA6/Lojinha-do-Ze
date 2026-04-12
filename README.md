# Lojinha do Zé

Lojinha do Zé is a comprehensive management system designed for a small retail shop, providing tools for inventory control, order management, customer tracking, and financial reporting.

## 🚀 Tech Stack

### Backend
- **Framework:** [Hono](https://hono.dev/)
- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database:** [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **Payment Gateway:** [Mercado Pago](https://www.mercadopago.com/)
- **Language:** TypeScript

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** CSS Modules / Tailwind CSS

---

## 🛠️ Local Setup

### Prerequisites
- Node.js (Latest LTS)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for backend development)
- A Neon PostgreSQL database instance

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.dev.vars` file (used by Wrangler for local secrets) from the template:
   ```bash
   cp env.example .dev.vars
   ```
4. Edit `.dev.vars` and provide your actual credentials:
   - `DATABASE_URL`: Your Neon connection string.
   - `FRONTEND_URL`: The URL where your frontend is running (e.g., `http://localhost:3000`).
   - `MERCADO_PAGO_ACCESS_TOKEN`: Your Mercado Pago access token.
   - `MERCADO_PAGO_WEBHOOK_SECRET`: Your webhook secret.

5. Initialize the database (run migrations and create default admin):
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file from the root template:
   ```bash
   cp ../env.example .env.local
   ```
4. Edit `.env.local` and set the API proxy:
   - `NEXT_PUBLIC_API_PROXY_BASE`: Point to your local Worker (e.g., `http://localhost:8787/api`).

5. Start the development server:
   ```bash
   npm run dev
   ```

---

## ☁️ Deployment

### Backend (Cloudflare Workers)
1. Ensure you are logged into Cloudflare:
   ```bash
   npx wrangler login
   ```
2. Deploy the worker:
   ```bash
   cd backend
   npm run deploy
   ```
3. Configure secrets in the Cloudflare Dashboard or via Wrangler:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put MERCADO_PAGO_ACCESS_TOKEN
   # ... etc
   ```

### Frontend (Vercel)
1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Configure the environment variable `NEXT_PUBLIC_API_PROXY_BASE` with your deployed Worker's URL.

---

## 📁 Project Structure

```text
.
├── backend/                # Hono API
│   ├── src/
│   │   ├── domain/         # Business schemas and constants
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── middleware/     # Auth, security, and logging middleware
│   │   ├── migrations/     # Database schema versions
│   │   ├── repositories/   # Data access layer
│   │   ├── routes/         # API endpoint definitions
│   │   ├── services/       # Business logic implementation
│   │   └── utils/          # Helper functions
│   ├── scripts/            # Maintenance scripts (DB nuke, admin creation)
│   └── wrangler.toml       # Cloudflare Workers configuration
├── frontend/               # Next.js Application
│   ├── src/
│   │   ├── app/            # App Router (Pages and Layouts)
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-based modules (Admin, Storefront, etc.)
│   │   ├── services/       # API client and service wrappers
│   │   └── lib/            # Core utilities and API configuration
│   └── public/             # Static assets
└── Fotos Produtos/         # Product image assets
```

## 🔑 Default Admin Credentials
If you used `npm run seed`, the default administrator is:
- **Email:** `jose@lojinha.com`
- **Password:** `admin123`
