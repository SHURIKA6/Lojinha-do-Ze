# Auditoria Técnica Destrutiva — Lojinha do Zé

**Escopo:** projeto como se fosse para produção com milhões de usuários.  
**Foco:** erros, riscos, más práticas e falhas que podem causar incidentes graves.

---

## 1. Arquitetura do sistema

### 1.1 Estrutura e modularização

- **Monorepo** com `frontend/` (Next.js) e `backend/` (Hono/Workers) está razoável.
- **Problemas:**
  - Duplicação de conceito de API no frontend: `lib/api.js` reexporta `services/api` e `utils/formatting`; `getMe`, `login`, `logout` vêm de `services/api/auth.js` mas são consumidos como `@/lib/api`. Quem mantém o projeto pode não saber onde alterar (lib vs services).
  - Dois `ProductGrid`: `components/productGrid/ProductGrid.js` e `components/loja/ProductGrid.js` — nomenclatura e responsabilidades não claras; risco de import errado.
  - `contexts/AuthContext.js` é só reexport de `services/auth/AuthContext.js` — camada desnecessária; aumenta acoplamento e confusão.

### 1.2 Acoplamento

- **Frontend → Backend:** correto via proxy `/api` e env (`API_PROXY_BASE`). Mas não existe contrato explícito (OpenAPI/Swagger); mudanças no backend quebram o front na base de tentativa e erro.
- **Auth:** middleware do Next chama `fetch('/api/auth/me')` em **toda** requisição que bate no matcher `/admin/*`, `/conta/*`, `/login`. Isso adiciona latência e carga no backend em toda navegação protegida; em escala, vira gargalo e ponto único de falha.

### 1.3 Separação de responsabilidades

- Backend: rotas, middleware, repositórios e serviços estão separados; **porém** em várias rotas a lógica de negócio está dentro do handler (ex.: `catalog.js` — merge de itens, cálculo de total, inserção de pedido e atualização de estoque no mesmo arquivo). Falta uma camada de “casos de uso”/services de domínio.
- Frontend: `StorefrontPageClient.js` concentra estado (mais de 15 `useState`), efeitos, handlers e UI — componente “God”; difícil de testar e evoluir.

### 1.4 Padrões ausentes ou mal implementados

- **Error boundary:** não há error boundary no layout; um erro não tratado em qualquer página derruba a árvore e a UX fica ruim.
- **Retry/backoff:** chamadas à API não têm retry; falha de rede = mensagem genérica e usuário precisa recarregar.
- **Validação no frontend:** formulários dependem só da validação do backend; não há schema (Zod/Yup) no cliente para feedback imediato e mensagens alinhadas.

### 1.5 Sugestão de arquitetura

- Introduzir uma camada de **application services** no backend (ex.: `CreateOrderService`) que orquestre repositórios e regras; rotas só validam input e delegam.
- No frontend: extrair estado e lógica da loja para um hook `useStorefront` (ou store leve) e deixar o componente só de apresentação; adicionar error boundary no layout raiz; definir contrato da API (OpenAPI) e gerar tipos/cliente se possível.

---

## 2. Código

### 2.1 Código duplicado

- **`validationError(result, c)`** — definido de forma idêntica em: `auth.js`, `orders.js`, `products.js`, `customers.js`, `profile.js`, `catalog.js`, `transactions.js`. Deveria ser uma função em `utils/http.js` (ou `domain/validation.js`) e reutilizada.
- **Padrão de try/catch + jsonError:** repetido em toda rota; poderia ser um wrapper `handleRoute(fn)` que aplica try/catch e formatação de erro.

### 2.2 Funções grandes / confusas

- **`StorefrontPageClient.js`:** centenas de linhas, muitos estados e `useEffect`; `handleCheckout` e lógica de pedido embutidas. Deveria ser quebrado em hooks e subcomponentes.
- **`security.js`:** `getAllowedOriginConfig`, `getForwardedOrigin`, `getForwardedHost`, `parseForwardedParams` — lógica de origem/forwarding é densa e difícil de testar em unidade; vale extrair para módulo testável.

### 2.3 Complexidade e legibilidade

- **orders.js:** `restoreOrderStock` + transação + PATCH/DELETE com `FOR UPDATE` — fluxo correto mas concentrado; um “service” de pedido deixaria a intenção mais clara.
- **customers.js:** rota `PATCH /:id/role` com senha hardcoded (ver seção 3) — além do risco de segurança, polui o arquivo.

### 2.4 Variáveis mal nomeadas

- `revRow`, `expRow`, `activeRow`, `salesRow` em `dashboard.js` — abreviações obscuras; `revenueRows`, `expenseRows`, etc. seriam mais claras.
- `c` usado em todo backend (contexto Hono) — convenção do framework, mas em funções longas um nome como `ctx` ajuda.

### 2.5 Código morto / inconsistência

- **`JWT_SECRET`** em `wrangler.toml`: comentário diz para configurar, mas **não há uso de JWT no projeto**; sessão é cookie-based. Secret morto e confusão para quem faz deploy.
- **`avatar VARCHAR(5)`** na migration: `buildAvatar` retorna 2 letras; tamanho 5 não reflete o domínio e pode sugerir uso futuro não definido.

### 2.6 Más práticas

- **auth.js (backend) linha 169:** `resolveSession(c, client)` é chamado de novo dentro do handler de change-password mesmo após `authMiddleware` já ter resolvido a sessão — redundante e pode divergir do que está em `c.get('session')`.
- **Catalog POST /orders:** cliente logado deve usar o mesmo telefone do pedido; a mensagem "Telefone do pedido não corresponde ao cliente autenticado" é boa, mas o fluxo para “editar perfil” no checkout não está óbvio em uma única tela.

---

## 3. Segurança (análise agressiva)

### 3.1 CRÍTICO — Senha administrativa hardcoded (escalação de privilégio)

**Arquivo:** `backend/src/routes/customers.js` (linhas 269–271).

```javascript
if (password !== '160506') {
  return jsonError(c, 403, 'Senha administrativa incorreta');
}
```

- **Risco:** Qualquer pessoa com acesso ao código (repositório, ex-funcionário, vazamento) sabe a “senha” para alterar role de qualquer usuário para `admin`. Um admin comprometido pode promover outra conta. A senha está em texto plano no repositório.
- **Ataque:** Admin malicioso ou atacante que obtém sessão de admin chama `PATCH /api/customers/:id/role` com `{ "role": "admin", "password": "160506" }` e promove qualquer usuário. Ou: vazamento do repo → busca por "160506" → descoberta do backdoor.
- **Correção:** Remover essa “senha” do código. Se for necessário um segundo fator para mudança de role, usar secret em variável de ambiente (não commitada) ou fluxo de aprovação/auditoria, nunca valor fixo no código.

### 3.2 ALTO — Path traversal no download de imagens (upload)

**Arquivo:** `backend/src/routes/upload.js` (linhas 56–58).

```javascript
router.get('/products/:filename', async (c) => {
  const filename = `products/${c.req.param('filename')}`;
  // ...
  const object = await bucket.get(filename);
```

- **Risco:** Em frameworks como Hono, `param('filename')` pode vir de um path normalizado, mas a rota é `/products/:filename`. Uma URL como `/api/upload/products/..%2F..%2Foutro` ou segmentos com `..` pode resultar em `filename` que, concatenado com `products/`, acesse chaves fora da pasta `products/` no bucket (path traversal).
- **Ataque:** Atacante descobre que imagens são servidas em `/api/upload/products/<filename>`. Testa `filename=../config` ou encoding e tenta ler objetos arbitrários do R2 se o runtime não normalizar.
- **Correção:** Validar `filename` com whitelist: ex. só permitir `[a-zA-Z0-9._-]+` e rejeitar se contiver `..` ou `/`. Ex.: `if (!/^[a-zA-Z0-9._-]+$/.test(c.req.param('filename')) || c.req.param('filename').includes('..')) return c.json({ error: 'Invalid filename' }, 400);`

### 3.3 ALTO — Upload de arquivo: confiança apenas em `Content-Type`

**Arquivo:** `backend/src/routes/upload.js` (linhas 22–25).

- A verificação é só `file.type` (MIME vindo do cliente). Cliente pode enviar um executável com `Content-Type: image/jpeg`.
- **Risco:** Upload de arquivo malicioso armazenado como “imagem” e depois servido; em alguns contextos (ex.: se no futuro houver preview ou processamento no servidor) pode levar a execução ou XSS.
- **Correção:** Validar magic bytes (assinatura do arquivo) no início do buffer; aceitar apenas JPEG/PNG/WebP conforme assinaturas conhecidas. Manter também o limite de 5 MB e a whitelist de extensão.

### 3.4 Enumeração de usuários (timing no login)

**Arquivo:** `backend/src/routes/auth.js` (login).

- Mensagem única (“E-mail, telefone ou senha incorretos”) evita vazamento por texto, mas o **tempo de resposta** é diferente: usuário inexistente → só query; usuário existente → query + bcrypt.compare. Medindo tempo, um atacante pode inferir se um e-mail/telefone está cadastrado.
- **Correção:** Se usuário não existir, executar mesmo assim um `bcrypt.compare` com um hash dummy (ex. hash de uma string fixa) para manter tempo de resposta parecido. Ou usar delay mínimo constante.

### 3.5 CSRF

- **Estado atual:** Cookie `lz_csrf` (não httpOnly), header `X-CSRF-Token` em métodos não-GET; backend compara token do header com o do cookie e com o da sessão. Para usuários autenticados está correto.
- **Gap:** POST `/api/catalog/orders` aceita pedidos de **visitantes** (sem sessão). Nesse caso o middleware de CSRF deixa passar (sem cookie de sessão). Em teoria um site malicioso poderia postar um pedido em nome do visitante; na prática, CORS e SameSite reduzem o cenário, mas o pedido em si não exige CSRF token para anônimos — risco residual em cenários de mashup ou configuração incorreta de CORS.
- **Recomendação:** Manter política de CORS restritiva; considerar token CSRF também para criação de pedido anônimo (ex. token em meta tag ou cookie SameSite) se quiser endurecer.

### 3.6 SQL Injection

- **Avaliação:** Queries usam parâmetros preparados (`$1`, `$2`, …). Nenhuma concatenação de string com input do usuário nas queries analisadas. **Sem indício de SQL injection** nas rotas revisadas.

### 3.7 XSS

- **Frontend:** Uso de `dangerouslySetInnerHTML` em `page.js` apenas para JSON-LD: `JSON.stringify(jsonLd)`. JSON.stringify escapa caracteres que quebrariam o script; o conteúdo é controlado pelo servidor. **Risco baixo** desde que `jsonLd` nunca inclua input do usuário não sanitizado.
- **Backend:** Respostas são JSON; cabe ao frontend não injetar respostas em HTML. Não foi encontrado uso de dados do usuário em HTML gerado no servidor.

### 3.8 Cookies e sessão

- Session cookie: `httpOnly`, `SameSite=Lax`, `secure` em produção. CSRF cookie não-httpOnly é intencional para leitura pelo JS e envio no header. Configuração adequada.
- **Observação:** `SESSION_TTL_SECONDS = 7 * 24 * 60 * 60` (7 dias) é longo; em caso de roubo de cookie, a janela de abuso é grande. Considerar redução ou refresh com atividade.

### 3.9 Rate limiting

- **Estado:** Limites por IP em memória (login 5/15 min, setup-password 5/15 min, orders 10/hora, API geral 60/min). Comentário no código avisa que Workers são por isolate — rate limit não é global.
- **Risco:** Em escala, muitos isolates; um atacante com muitos IPs ou muitas requisições distribuídas pode ultrapassar o limite por “usuário” real. Para login/setup, 5 tentativas por 15 min por IP ainda ajuda contra brute-force simples.
- **Recomendação:** Para produção séria, usar rate limiting global (ex. Cloudflare Rate Limiting, Redis/KV) especialmente em login e criação de pedido.

### 3.10 CORS e Origin

- CORS e origin guard estão implementados; origens permitidas vêm de env e lista local. **Nenhuma falha óbvia**; manter lista de origens atualizada em produção.

### 3.11 Outros

- **Exposição de tokens:** Setup de senha usa URL com `?token=...` (token em query). Se o usuário colar a URL em histórico, proxy logs ou referrer, o token pode vazar. Preferível token em cookie ou POST body quando possível.
- **Falhas de validação:** Inputs validados com Zod no backend; tamanhos máximos e enums definidos. Nenhuma falha grave de validação identificada.

---

## 4. Autenticação e autorização

### 4.1 Rotas protegidas no frontend

- **Middleware Next.js** protege apenas `/admin/*`, `/conta/*` e `/login`. **`/cliente`** não está no matcher; na prática `/cliente` e `/cliente/perfil` redirecionam para `/conta` (permanentRedirect), então o acesso real é por `/conta`. Porém, se no futuro alguém adicionar conteúdo em `/cliente` sem redirecionar, essa rota pode ficar desprotegida. **Recomendação:** incluir `/cliente` no matcher e tratar como área autenticada (ou manter só redirect e documentar).

### 4.2 Backend: consistência de proteção

- **Produtos:** `router.use('*', authMiddleware, adminOnly)` — todas as rotas de produtos exigem admin; POST/PUT/DELETE usam também CSRF. OK.
- **Customers:** mesmo padrão; PATCH role tem a senha hardcoded (já citada).
- **Orders:** GET filtra por `user.id` quando role é customer; PATCH/DELETE status exigem adminOnly. OK.
- **Profile:** authMiddleware; PUT exige CSRF. OK.
- **Catalog GET:** sem auth (público). POST orders usa optionalAuth + CSRF + orderLimiter. OK.
- **Upload:** auth + adminOnly + CSRF. OK.

### 4.3 Escalação de privilégio

- Único vetor crítico encontrado é o backdoor da “senha administrativa” em `customers.js` (já detalhado).

### 4.4 Sessão

- Sessão resolvida por cookie, hash do token na DB, CSRF atrelado à sessão. Logout invalida sessão e remove cookies. Nenhuma falha óbvia de fixação ou reuso de sessão.

---

## 5. UI / UX

### 5.1 Fluxos

- **Checkout:** Muitos estados (endereço, tipo entrega, pagamento, perfil). Usuário “registrado” vs “editando” pode confundir; o texto “Você está editando seus dados salvos” ajuda, mas o fluxo ainda é pesado.
- **Login:** Redirecionamento por role (admin → /admin/dashboard, customer → /conta) está correto; porém, se `/api/auth/me` falhar (erro de rede), o middleware redireciona tudo para `/login` (fail-closed), o que pode deslogar usuários em instabilidade de rede.

### 5.2 Feedback visual

- Uso de toasts e estados de loading em vários pontos é positivo. Em formulários (ex.: checkout), falta feedback de validação em tempo real (ex.: telefone inválido antes de submeter).
- Após erro de API, em várias telas só aparece “Recarregar página”; não há retry automático ou mensagem mais guiada.

### 5.3 Layout e responsividade

- Uso de CSS variables e grid; não foi feita análise pixel a pixel, mas a estrutura suporta responsividade. Garantir testes em mobile (teclado, modais, tabelas no admin).

### 5.4 Acessibilidade

- Alguns botões e ícones podem não ter texto alternativo ou `aria-label`; formulários têm labels associados (bom). Revisar contraste, foco e navegação por teclado em modais e sidebars.

### 5.5 Navegação

- Admin: Sidebar com links; loja: Header com carrinho. Estrutura razoável. **Risco:** Se o backend retornar 401 em uma chamada no meio da sessão, o front dispara `auth:expired` e limpa usuário; pode ser bom ter um aviso “Sessão expirada, faça login novamente” em vez de só redirecionar.

---

## 6. Performance

### 6.1 Renderizações desnecessárias

- **StorefrontPageClient:** Muitos `useState`; atualizar um (ex.: busca) pode causar re-renders em toda a árvore. Componentes filhos (ProductGrid, CartSidebar, CheckoutModal) recebem muitas props; considerar memo/useMemo/useCallback onde for crítico, ou estado mais local.

### 6.2 Queries e backend

- Dashboard faz várias queries em sequência; poderiam ser paralelizadas com `Promise.all` onde não houver dependência para reduzir latência.
- Catalog GET e listagens usam índices (ex.: `idx_products_category`, `idx_orders_created_at`); migrations 001 e 003 cobrem índices básicos. Para “milhões de usuários”, relatórios e listagens grandes precisarão de paginação (hoje não há `LIMIT`/offset em vários endpoints).

### 6.3 JS e bundle

- Next 16 com App Router; código da loja em client components. Não foi medida o tamanho do bundle; `recharts`, `leaflet` e `react-icons` tendem a aumentar o bundle — considerar import por ícone e lazy load de telas pesadas (ex.: admin relatórios).

### 6.4 Imagens

- Uso de `AppImage` com `loading="lazy"` e Next/Image para paths relativos é bom. Garantir que em produção as imagens de produto sejam servidas com cache longo (já há `Cache-Control: public, max-age=31536000` no GET de upload) e, se possível, CDN na frente do Worker.

### 6.5 Cache

- Backend não define cache para respostas de catálogo ou listagens; `setNoStore` em dados sensíveis está correto. Para catálogo público, considerar cache de curta duração (ex. 1 min) no edge para reduzir carga no DB.

---

## 7. Banco de dados

### 7.1 Estrutura

- **users:** email e phone UNIQUE; password nullable (convite). OK.
- **orders:** items em JSONB; customer_id e customer_phone; status, delivery_type, payment_method. Faz sentido para o domínio.
- **auth_sessions:** token_hash, csrf_token, expires_at, last_seen_at. OK.
- **password_setup_tokens:** token_hash, setup_code, consumed_at. OK.
- **transactions:** type, category, value, date, order_id. OK.
- **Observação:** `orders.customer_phone` permite pedidos sem `customer_id`; a amarração por telefone em `customers.js` (GET /:id/orders) usa REGEXP_REPLACE — em tabelas grandes pode ser custoso; considerar coluna normalizada (ex. `customer_phone_digits`) e índice.

### 7.2 Índices

- 001 e 003 adicionam índices em orders (status, created_at, customer_id, customer_phone), transactions (type, date), auth_sessions, password_setup_tokens, products (category). Cobertura básica adequada.
- **Gap:** Se houver muitas sessões, `deleteExpiredSessions` roda em toda resolução de sessão; índice em `expires_at` já existe. Pode ser útil job periódico para limpar em lote em vez de deletar sob demanda.

### 7.3 Normalização

- Dados de cliente no pedido (customer_name, customer_phone, address) estão desnormalizados no order — aceitável para histórico. Sem problemas graves.

### 7.4 Concorrência

- Criação de pedido e atualização de estoque em transação; uso de `quantity >= $1` no UPDATE evita estoque negativo. Cancelamento usa `FOR UPDATE` e restaura estoque. Boa abordagem para concorrência simples.

### 7.5 Perda de dados

- Scripts `db-nuke` e `clear-db` são destrutivos; devem ficar restritos a dev/staging e nunca em pipeline de produção sem proteção. Documentação em README dos scripts está adequada.

---

## 8. Deploy e infraestrutura

### 8.1 Configuração e variáveis

- **Falta de `env.example`:** Não existe no repositório; documentação em `backend/scripts/README.md` e comentários no `wrangler.toml` ajudam, mas um `.env.example` com todas as chaves (sem valores) facilita onboarding e deploy.
- **Secrets:** DATABASE_URL e JWT_SECRET (este não usado) como secrets no Cloudflare é correto. Garantir que `FRONTEND_URL` e `ALLOWED_ORIGINS` estejam definidos em produção.

### 8.2 Proxy Next → Backend

- Rewrite `/api` para `API_PROXY_BASE` / `NEXT_PUBLIC_API_PROXY_BASE`. Em Vercel, a requisição do browser vai para o mesmo host; o server-side Next faz o request ao Worker. Em produção, configurar a URL do Worker (ex. `https://lojinha-do-ze-backend.<account>.workers.dev`) e, se necessário, domínio custom. CORS no backend já considera origens configuráveis.

### 8.3 Logs e monitoramento

- **Logs:** Apenas `console.error` em catch; não há formato estruturado (JSON), correlation id ou integração com sistema de log. Em produção, dificulta diagnóstico e alertas.
- **Monitoramento:** Nenhuma integração com APM, health check além de `/api/health`, ou métricas de negócio (pedidos/min, erros 5xx). Para “milhões de usuários” isso é insuficiente.

### 8.4 Backup

- Neon gerencia backups; não há menção a política de backup no projeto. Garantir que a equipe conheça e use os backups do Neon e que exista procedimento de restauração.

---

## 9. Experiência do desenvolvedor

### 9.1 Manutenção

- Código duplicado (validationError, padrões de erro) e componente God na loja aumentam o custo de manutenção e a chance de regressão.

### 9.2 Documentação

- README dos scripts do backend existe; falta README na raiz explicando como rodar front + backend juntos, variáveis e fluxo de deploy. Não há documentação da API (OpenAPI).

### 9.3 Scripts

- `npm run dev` no frontend; no backend, `wrangler dev` e `npm run seed`, `create-admin`. Para desenvolvimento local, é necessário rodar os dois e configurar DATABASE_URL e proxy. Um único script na raiz (ex. `pnpm dev` que sobe os dois) melhoraria o onboarding.

### 9.4 Padronização

- Prettier na raiz; backend em ESM. Frontend usa `@/`; padrão de nomes (PascalCase componentes, camelCase funções) consistente. Falta: ESLint (e regras de acessibilidade/segurança), convenção de mensagens de commit e talvez Conventional Commits.

---

## 10. Bugs potenciais

1. **auth.js (backend) /me:** Usa `c.get('db').query(...)`. O objeto `db` é o wrapper retornado por `createDb`, que tem `.query` delegando ao pool. Em contexto de Worker, garantir que o pool suporte uso direto de `db.query` (está ok no código, mas em alta concorrência verificar se não há vazamento de conexão).
2. **Middleware Next:** Se `fetchMe` der timeout ou 502, `result.kind === 'error'` e qualquer rota protegida redireciona para `/login`. Usuário logado pode ser deslogado por instabilidade. Considerar timeout e fallback (ex.: manter na página e mostrar “Não foi possível verificar sessão”).
3. **Checkout:** `customerForm` inicial `{ name: '', phone: '', notes: '' }`; ao rehidratar do localStorage, `notes` não é restaurado no estado inicial do formulário de checkout (apenas name, phone, address, coords). Pode ser intencional; verificar se “observações” deve ser persistido.
4. **Relatórios:** GET `/api/reports/:type` — se `type` não for um dos cases, retorna 400. Valores esperados não estão documentados na API; cliente pode enviar qualquer string e receber “Tipo de relatório inválido” sem lista de tipos válidos.
5. **orders.js:** `id` em `c.req.param('id')` é string; usado em `$1` no PostgreSQL. SERIAL aceita string numérica; se alguém passar `id=abc`, a query pode falhar ou gerar comportamento inesperado. Validar como inteiro (ex. Zod) na rota.

---

## 11. Anti-patterns

1. **Backdoor de “senha” no código** — já tratado como crítico.
2. **Validação de erro duplicada em cada rota** — mesma função em 7+ arquivos; deveria ser utilitário único.
3. **Objeto “db” criado por request** — `createDb(connectionString)` a cada request e `db.close()` no finally. Pool do Neon é reutilizado, mas o wrapper é novo; padrão aceitável em serverless, porém misturar `db.query` (pool) com `db.connect()` (client) em rotas diferentes pode confundir (ex.: auth/me usa `db.query`, outras usam `client`). Padronizar: ou sempre pool.query, ou sempre client por request.
4. **Estado global de rate limit em memória** — em Workers, por isolate, o limite não é global; para consistência de política, isso é um anti-pattern em ambiente distribuído.
5. **Componente único com toda a lógica da loja** — StorefrontPageClient concentra estado, efeitos e UI; dificulta testes e reuso.

---

## 12. Problemas invisíveis (previsão para produção)

1. **Pico de tráfego:** Muitas conexões ao Neon a partir de vários isolates; pool size e connection limit do Neon podem ser atingidos, gerando 500 em cascata. Configurar pool e timeouts; considerar connection pooler (ex. Neon pooler).
2. **Crescimento de sessões e tokens:** Tabelas `auth_sessions` e `password_setup_tokens` sem limpeza agressiva; com milhões de usuários, podem crescer demais. Job periódico para deletar expirados e talvez limitar sessões por usuário.
3. **Relatórios sem paginação:** Endpoints de relatórios retornam tudo (vendas, estoque, clientes, transações). Com muitos registros, payload e tempo de resposta crescem até timeout ou OOM. Introduzir paginação e filtros por data.
4. **Upload em alta frequência:** Muitos admins fazendo upload ao mesmo tempo; R2 aguenta, mas o Worker pode ficar ocupado com `file.arrayBuffer()` e bloqueio. Avaliar limites e filas se necessário.
5. **Frontend: hidratação e cache:** Dados iniciais do catálogo vêm do server component; se o cache do Next ou do CDN estiver muito agressivo, usuários podem ver catálogo desatualizado. Revalidar ou TTL curto onde fizer sentido.

---

## 13. Os 10 problemas mais perigosos

| # | Severidade | Problema |
|---|------------|----------|
| 1 | **Crítico** | Senha administrativa hardcoded em `customers.js` (PATCH role) — backdoor de escalação de privilégio. |
| 2 | **Alto** | Path traversal no GET de imagens de upload — validação insuficiente do parâmetro `filename`. |
| 3 | **Alto** | Upload confia apenas em `Content-Type` do cliente — falta validação por magic bytes. |
| 4 | **Alto** | Rate limiting apenas em memória por isolate — não é efetivo contra ataques distribuídos. |
| 5 | **Médio** | Possível enumeração de usuários por timing no login. |
| 6 | **Médio** | Middleware de auth no Next faz fetch em toda navegação protegida — latência e ponto único de falha; em erro de rede, desloga usuário. |
| 7 | **Médio** | Falta de `env.example` e documentação de deploy — risco de configuração errada em produção. |
| 8 | **Médio** | Relatórios e listagens sem paginação — risco de lentidão e timeout com muitos dados. |
| 9 | **Médio** | JWT_SECRET documentado mas não usado — confusão e possível uso futuro inseguro. |
| 10 | **Baixo** | Token de ativação de conta na URL (query) — risco de vazamento por referrer/logs. |

---

## 14. Plano de correção por prioridade

### Crítico (fazer imediatamente)

1. **Remover a “senha” hardcoded em `customers.js`.**  
   - Eliminar o `if (password !== '160506')` e o fluxo que depende dele; substituir por mecanismo seguro (env secret, 2FA, ou fluxo de aprovação) se mudança de role precisar de segundo fator.

### Alto

2. **Sanitizar `filename` no GET de upload:**  
   - Aplicar whitelist (ex.: apenas `[a-zA-Z0-9._-]+`), rejeitar `..` e `/`, retornar 400 para inválidos.
3. **Validar tipo de arquivo no upload por magic bytes:**  
   - Verificar os primeiros bytes do buffer (JPEG, PNG, WebP) e rejeitar o resto.
4. **Introduzir rate limiting global:**  
   - Usar Cloudflare Rate Limiting ou KV/Redis para login, setup-password e, se possível, criação de pedido.

### Médio

5. **Mitigar enumeração por timing no login:**  
   - Executar bcrypt dummy quando o usuário não existir ou aplicar atraso mínimo constante.
6. **Reduzir dependência do middleware de auth no Next:**  
   - Considerar cache curto do resultado de `/api/auth/me` no cliente ou em cookie assinado para reduzir chamadas; em falha de rede, não redirecionar imediatamente para login (mostrar aviso e retry).
7. **Adicionar `env.example` (e opcionalmente `.env.example` na raiz)** com todas as variáveis necessárias para front e back, sem valores sensíveis.
8. **Paginação em relatórios e listagens:**  
   - GET reports, GET orders, GET products, GET customers com `limit`/`offset` ou cursor e documentar na API.
9. **Remover ou implementar JWT_SECRET:**  
   - Se não usar JWT, remover do wrangler e da documentação; se for usar no futuro, documentar uso e nunca colocar valor no código.

### Baixo

10. **Token de ativação:**  
    - Preferir enviar token por POST body ou cookie em vez de query string; ou manter e reforçar que links não devem ser compartilhados e que o token expira.
11. **Extrair `validationError` e padrão de erro para utilitário único no backend.**
12. **Adicionar Error Boundary no layout raiz do frontend.**
13. **Documentar API (OpenAPI) e README de desenvolvimento e deploy.**

---

## 15. Melhorias estruturais

1. **Backend:** Camada de application services (ex.: `OrderService`, `AuthService` já existe; `CatalogService` para criação de pedido) para concentrar regras de negócio e deixar rotas finas (validação + chamada ao service).
2. **Frontend:** Quebrar `StorefrontPageClient` em hooks (`useCatalog`, `useCart`, `useCheckout`) e componentes de apresentação; considerar store leve (Context ou Zustand) para estado da loja.
3. **Contrato da API:** Especificar OpenAPI (ou similar) e gerar tipos TypeScript no frontend para reduzir erros de integração.
4. **Testes:** Testes unitários para normalização (normalize.js), crypto, e validação de schemas; testes de integração para login, criação de pedido e upload (com arquivo mock).
5. **Observabilidade:** Logs estruturados (JSON), correlation id por request, health check que verifique DB e R2; métricas de negócio (pedidos, erros) e alertas.
6. **Pipeline:** CI com lint, testes e build; deploy do backend (Wrangler) e frontend (Vercel) com variáveis de ambiente e secrets gerenciados fora do código.
7. **Segurança:** Revisão periódica de dependências (npm audit, Dependabot); nenhum secret em repositório (usar scanning); política de sessão (TTL, renovação, revogação).

---

*Auditoria realizada com base no estado do repositório no momento da análise. Recomenda-se reavaliar após correções e em cada release relevante.*
