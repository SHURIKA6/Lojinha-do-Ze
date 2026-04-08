# Lojinha do Zé

Aplicação full-stack de e-commerce com painel administrativo, painel de cliente, integração com Mercado Pago para pagamentos e funcionalidades de IA.

## Arquitetura

| Camada | Tecnologia | Deploy |
|--------|-----------|--------|
| **Frontend** | Next.js 16 + React 19 + TypeScript | Vercel |
| **Backend** | Cloudflare Workers + Hono + Zod | Cloudflare Workers |
| **Banco de Dados** | NeonDB (PostgreSQL serverless) | Neon |
| **Pagamentos** | Mercado Pago SDK | - |

## Pré-requisitos

- Node.js >= 20
- npm
- Conta no [Neon](https://neon.tech) (PostgreSQL)
- Conta no [Mercado Pago](https://www.mercadopago.com) (para pagamentos)

### Opcional: Docker

Para ambiente local com banco de dados containerizado:

- Docker Desktop
- Docker Compose

## Setup Local

### Opção A: Setup Tradicional

#### 1. Clone o repositório

```bash
git clone https://github.com/SHURIKA6/Lojinha-do-Ze.git
cd "Lojinha-do-Ze"
```

### 2. Configure as variáveis de ambiente

**Frontend** — copie `env.example` (raiz) para `.env.local`:

```bash
cp env.example frontend/.env.local
```

Edite e ajuste a URL da API de backend.

**Backend** — copie `backend/env.example` para `backend/.dev.vars`:

```bash
cp backend/env.example backend/.dev.vars
```

Edite com suas credenciais:
- `DATABASE_URL` — string de conexão do NeonDB
- `FRONTEND_URL` — URL do frontend local (`http://localhost:3000`)
- `MERCADO_PAGO_ACCESS_TOKEN` — token do Mercado Pago
- `JWT_SECRET` — segredo para JWT

### 3. Instale as dependências

```bash
# Backend
cd backend
npm install

# Frontend (em outro terminal)
cd frontend
npm install
```

### 4. Execute as migrações do banco

```bash
cd backend
npx tsx src/migrations/runner.ts
```

### 5. Crie um admin (opcional)

```bash
cd backend
npm run create-admin
```

### Opção B: Docker Compose

Para subir todo o ambiente localmente com banco de dados containerizado:

```bash
# Copie o arquivo de ambiente
cp backend/env.example backend/.dev.vars

# Edite backend/.dev.vars com suas credenciais

# Inicie os serviços
docker compose up -d

# O frontend estará em http://localhost:3000
# O backend estará em http://localhost:8787
# O banco de dados estará em localhost:5432
```

## Comandos

### Backend

```bash
npm run dev          # Inicia em modo desenvolvimento (Wrangler)
npm run build        # Type-check com TypeScript
npm run test         # Executa testes com Jest
npm run seed         # Limpa o banco de dados
npm run create-admin # Cria usuário administrador
npm run deploy       # Deploy para Cloudflare Workers
```

### Frontend

```bash
npm run dev          # Inicia servidor de desenvolvimento (localhost:3000)
npm run build        # Build de produção
npm run start        # Inicia servidor de produção
npm run test         # Executa testes com Jest
```

## Estrutura do Projeto

```
├── backend/                 # API Cloudflare Workers (Hono)
│   ├── src/
│   │   ├── domain/          # Schemas Zod, constantes, roles
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── middleware/      # Auth, CORS, rate limiting, segurança
│   │   ├── migrations/      # Migrações do banco de dados
│   │   ├── repositories/    # Camada de acesso a dados
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Lógica de negócio
│   │   └── server.ts        # Entry point
│   ├── scripts/             # Scripts utilitários (seed, create-admin)
│   └── tests/               # Testes unitários
│
├── frontend/                # Next.js Application
│   └── src/
│       ├── app/             # App Router (rotas e páginas)
│       │   ├── admin/       # Painel administrativo
│       │   ├── cliente/     # Painel do cliente
│       │   ├── login/       # Autenticação
│       │   └── loja/        # Loja (catálogo público)
│       ├── components/      # Componentes React reutilizáveis
│       ├── contexts/        # React Contexts
│       ├── features/        # Features por domínio
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Utilitários e configurações
│       ├── services/        # Serviços de API
│       └── types/           # Types TypeScript
│
└── .github/workflows/       # CI/CD (testes, build, segurança)
```

## Documentação da API

A API possui documentação completa no formato OpenAPI 3.0 (Swagger).

### Visualizar Documentação

1. **Online (Swagger UI):**
   - Acesse https://editor.swagger.io
   - Faça upload do arquivo `backend/openapi.yml`

2. **Local (Swagger UI):**
   ```bash
   # Instale o swagger-ui-express ou use ferramentas como Insomnia/Postman
   # que importam automaticamente arquivos OpenAPI
   ```

### Resumo das Rotas

| Tag | Endpoints | Descrição |
|-----|-----------|-----------|
| **Auth** | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Autenticação e sessão |
| **Clientes** | `GET/POST/PUT/DELETE /customers/*` | Gestão de clientes (admin) |
| **Catálogo** | `GET /catalog`, `POST /catalog/orders` | Produtos e criação de pedidos |
| **Pedidos** | `GET/PATCH/DELETE /orders/*` | Gestão de pedidos |
| **Dashboard** | `GET /dashboard` | Métricas administrativas |
| **IA** | `GET /analytics/forecast`, `POST /ai/chat` | Previsão, sentiment analysis, chat com IA |

### Autenticação

A API usa autenticação baseada em cookies:

1. Faça login em `POST /api/auth/login`
2. O cookie `session_id` é retornado no header `Set-Cookie`
3. Inclua o cookie nas requisições subsequentes
4. Use o header `X-CSRF-Token` para operações de escrita (POST/PUT/PATCH/DELETE)

## CI/CD

O projeto possui pipelines GitHub Actions:

- **CI** — lint, testes (backend) e build (frontend) em cada push/PR
- **Security Scan** — `npm audit` + ESLint security em cada push/PR

## Hooks de Pré-Commit

O projeto usa `husky` + `lint-staged` para validação automática antes de commits:

- **Backend**: ESLint + Prettier
- **Frontend**: Prettier

Os hooks são executados automaticamente ao rodar `git commit`.

## Deploy

### Backend (Cloudflare Workers)

```bash
cd backend
npm run deploy
```

As credenciais do Cloudflare devem estar configuradas via `wrangler login`.

### Frontend (Vercel)

Conecte o repositório ao Vercel e configure as variáveis de ambiente no dashboard. O deploy é automático em pushes na branch `main`.

## Contribuição

1. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
2. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
3. Push para a branch (`git push origin feature/nome-da-feature`)
4. Abra um Pull Request

### Testes E2E

Para garantir a qualidade do código, é importante rodar os testes end-to-end antes de enviar um PR.

```bash
npm run e2e
```

---

## Status do Projeto

| Categoria | Score | Status |
|-----------|-------|--------|
| Segurança | 8.5/10 | ✅ Validação zod, bcrypt, CORS, rate limiting |
| Código | 8.5/10 | ✅ TypeScript strict, organização clara |
| Documentação | 9/10 | ✅ README, OpenAPI/Swagger |
| DevOps | 8.5/10 | ✅ CI/CD, Docker, husky |
| Manutenibilidade | 9/10 | ✅ Estrutura clara, shared removida |
| **TOTAL** | **8.7/10** | ✅ Projeto em bom estado |
