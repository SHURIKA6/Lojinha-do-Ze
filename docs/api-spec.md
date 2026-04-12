# 📡 Especificação da API - Lojinha do Zé

Esta documentação detalha os endpoints da API, os formatos de requisição e as respostas esperadas.

## 🔐 Autenticação e Autorização

A API utiliza sessões baseadas em cookies HTTP-only e tokens CSRF.

- **Sessão**: Criada após login bem-sucedido via cookie `session_id`.
- **CSRF**: Token enviado no corpo da resposta do login e deve ser enviado no cabeçalho `x-csrf-token` em requisições de escrita (POST, PUT, PATCH, DELETE).
- **Roles**:
  - `customer`: Acesso ao catálogo e seus próprios pedidos.
  - `admin`: Acesso total, incluindo gestão de produtos e todos os pedidos.

---

## 🛒 Catálogo de Produtos

### Listar Produtos (Catálogo)
`GET /api/catalog`

**Query Params**:
- `search` (opcional): Busca por nome (ILIKE).
- `category` (opcional): Filtra por categoria.
- `limit` (opcional, default: 50): Quantidade de itens.
- `offset` (opcional, default: 0): Ponto de partida.

**Resposta (200 OK)**:
```json
{
  "categories": [
    {
      "name": "Categoria X",
      "products": [
        { "id": "...", "code": "...", "name": "...", "sale_price": 10.0, "quantity": 5 }
      ]
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

## 📦 Pedidos

### Criar Pedido
`POST /api/catalog/orders`

**Payload**:
```json
{
  "customer_name": "Nome do Cliente",
  "customer_phone": "11999999999",
  "items": [
    { "productId": "1", "quantity": 2 }
  ],
  "delivery_type": "entrega|retirada",
  "address": "Rua X, 123",
  "payment_method": "pix|cartao",
  "notes": "Observação opcional"
}
```

**Resposta (201 Created)**:
```json
{
  "order": { "id": "...", "total": 150.0, "status": "pendente" },
  "message": "Pedido #... criado com sucesso!"
}
```

### Atualizar Status do Pedido (Admin)
`PATCH /api/orders/:id/status`

**Payload**:
```json
{
  "status": "pendente|pago|cancelado|concluido"
}
```

**Resposta (200 OK)**:
```json
{
  "id": "...",
  "status": "concluido"
}
```

---

## 🔑 Autenticação

### Login
`POST /api/auth/login`

**Payload**:
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Resposta (200 OK)**:
```json
{
  "user": { "id": "...", "role": "admin" },
  "csrfToken": "...",
  "easterEgg": false
}
```

### Meu Perfil
`GET /api/auth/me`

**Resposta (200 OK)**:
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "role": "admin" },
  "csrfToken": "..."
}
```

---

## 🛠️ Administração de Produtos (Admin)

### Listar Produtos
`GET /api/products`

### Obter Produto
`GET /api/products/:id`

### Criar Produto
`POST /api/products`

### Atualizar Produto
`PUT /api/products/:id`

### Excluir Produto
`DELETE /api/products/:id`
