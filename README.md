# 🛍️ Lojinha do Zé

Lojinha do Zé é um sistema de e-commerce simplificado, projetado para ser leve, escalável e seguro. O sistema gerencia catálogos de produtos, processamento de pedidos, controle de estoque e integração de pagamentos.

## 🚀 Tecnologias Utilizadas

### Backend

- **Framework:** [Hono](https://hono.dev/) (Ultra-fast web framework for Edge)
- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Banco de Dados:** [Neon](https://neon.tech/) (Serverless PostgreSQL) / Cloudflare D1
- **Pagamentos:** [Mercado Pago](https://www.mercadopago.com/)
- **Inteligência Artificial:** Google Gemini API
- **Linguagem:** TypeScript

### Frontend

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Linguagem:** TypeScript
- **Estilização:** CSS Modules / Tailwind CSS

---

## 🏗️ Arquitetura

O projeto segue o padrão **Route $\rightarrow$ Service $\rightarrow$ Repository**, garantindo a separação de responsabilidades e facilitando a manutenção:

- **Routes (`backend/src/routes`)**: Camada de entrada. Responsável por validar requisições (usando Zod), lidar com HTTP e delegar a lógica para os serviços.
- **Services (`backend/src/services`)**: Camada de lógica de negócio. Onde as regras de negócio são aplicadas, transações são coordenadas e integrações externas são gerenciadas.
- **Repositories (`backend/src/repositories`)**: Camada de persistência. Única camada que executa queries SQL no banco de dados.

## 🛠️ Configuração e Instalação

### Pré-requisitos

- Node.js (v18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (para desenvolvimento backend)
- Uma instância do Neon PostgreSQL

### Configuração do Backend

1. Navegue até o diretório do backend:

   ```bash
   cd backend
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie um arquivo `.dev.vars` a partir do template:

   ```bash
   cp env.example .dev.vars
   ```

4. Edite o `.dev.vars` com suas credenciais:
   - `DATABASE_URL`: String de conexão do Neon.
   - `FRONTEND_URL`: URL do frontend (ex: `http://localhost:3000`).
   - `MERCADO_PAGO_ACCESS_TOKEN`: Token do Mercado Pago.
   - `GEMINI_API_KEY`: Chave da API do Google Gemini.

5. Inicialize o banco de dados (migrações e admin padrão):

   ```bash
   npm run seed
   ```

6. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

### Configuração do Frontend

1. Navegue até o diretório do frontend:

   ```bash
   cd frontend
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie um arquivo `.env.local`:

   ```bash
   cp ../env.example .env.local
   ```

4. Configure o proxy da API:
   - `NEXT_PUBLIC_API_PROXY_BASE`: Aponte para o Worker local (ex: `http://localhost:8787/api`).

5. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

---

## ☁️ Implantação (Deployment)

### Backend (Cloudflare Workers)

1. Login no Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Deploy do worker:

   ```bash
   cd backend
   npm run deploy
   ```

3. Configure os secrets no Dashboard do Cloudflare ou via Wrangler:

   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put MERCADO_PAGO_ACCESS_TOKEN
   ```

### Frontend (Vercel)

1. Conecte o repositório do GitHub ao Vercel.
2. Configure a variável de ambiente `NEXT_PUBLIC_API_PROXY_BASE` com a URL do seu Worker implantado.

---

## 📁 Estrutura do Projeto

```text
.
├── backend/                # API Hono
│   ├── src/
│   │   ├── domain/         # Schemas de negócio e constantes
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── middleware/     # Middleware de auth, segurança e log
│   │   ├── migrations/     # Versões do schema do banco
│   │   ├── repositories/   # Camada de acesso a dados (SQL)
│   │   ├── routes/         # Definições de endpoints da API
│   │   ├── services/       # Implementação da lógica de negócio
│   │   └── utils/          # Funções utilitárias
│   └── wrangler.toml       # Configuração do Cloudflare Workers
├── frontend/               # Aplicação Next.js
│   ├── src/
│   │   ├── app/            # App Router (Páginas e Layouts)
│   │   ├── components/     # Componentes de UI reutilizáveis
│   │   ├── features/       # Módulos por funcionalidade (Admin, Loja, etc.)
│   │   ├── services/       # Wrappers de API e serviços
│   │   └── lib/            # Utilidades centrais e config da API
│   └── public/             # Ativos estáticos
└── Fotos Produtos/         # Imagens dos produtos
```

## 🔑 Credenciais Admin Padrão

Se você utilizou `npm run seed`, o administrador padrão é:

- **E-mail:** `jose@lojinha.com`
- **Senha:** `admin123`
