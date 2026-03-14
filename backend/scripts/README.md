# Scripts (backend)

Scripts utilitários para manutenção do banco e administração.

Em geral, prefira o fluxo de migrations + seed (db-bootstrap) e use os scripts abaixo quando necessário.

## seed (db-bootstrap)

Inicializa o schema via migrations e (se o banco estiver vazio) insere dados de exemplo.

### Variáveis de ambiente

- `DATABASE_URL` (obrigatória)
- `ADMIN_PASSWORD` (opcional)
- `CLIENT_PASSWORD` (opcional)

### Como rodar

```bash
npm -C backend run seed
```

Ou:

```bash
node backend/src/db-bootstrap.js
```

## create-admin

Cria ou atualiza um usuário administrador (upsert por e-mail) e reseta a senha.

### Variáveis de ambiente

- `DATABASE_URL` (obrigatória)
- `ADMIN_EMAIL` (obrigatória)
- `ADMIN_PASSWORD` (obrigatória)
- `ADMIN_NAME` (opcional, padrão: `Administrador`)
- `ADMIN_PHONE` (opcional)

### Como rodar

```bash
npm -C backend run create-admin
```

Ou:

```bash
node backend/scripts/create-admin.js
```

## db-nuke

Remove (DROP) tabelas do banco para permitir uma reconstrução limpa.

⚠️ **Destrutivo**: apaga dados.

### Variáveis de ambiente

- `DATABASE_URL` (obrigatória)

### Como rodar

```bash
node backend/scripts/db-nuke.js
```

Após rodar, execute o seed para recriar o schema:

```bash
npm -C backend run seed
```

## legacy-alter-db (legado)

Script legado que adiciona colunas na tabela `products` (ex.: `description` e `photo`).

### Variáveis de ambiente

- `DATABASE_URL` (obrigatória)

### Como rodar

```bash
node backend/scripts/legacy-alter-db.js
```

## legacy-fix-auth-tables (legado)

Script legado que cria/ajusta tabelas de autenticação (ex.: `auth_sessions` e `password_setup_tokens`).

### Variáveis de ambiente

- `DATABASE_URL` (obrigatória)

### Como rodar

```bash
node backend/scripts/legacy-fix-auth-tables.js
```
