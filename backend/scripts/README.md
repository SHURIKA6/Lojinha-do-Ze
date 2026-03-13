# Scripts (backend)

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

