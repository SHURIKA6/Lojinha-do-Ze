# 🏗️ Arquitetura do Sistema - Lojinha do Zé

Este documento descreve a estrutura arquitetural do sistema Lojinha do Zé, focando na separação de responsabilidades para garantir manutenibilidade e escalabilidade.

## 📐 Padrão de Camadas

O sistema utiliza o padrão **Route $\rightarrow$ Service $\rightarrow$ Repository**. Cada camada possui uma responsabilidade única e estrita:

### 1. Camada de Rotas (`/src/routes`)
A camada de rotas é a porta de entrada da API.
- **Responsabilidades**:
  - Definição de endpoints e métodos HTTP.
  - Validação de entrada (Payloads) utilizando **Zod**.
  - Gerenciamento de autenticação e autorização (Middlewares).
  - Tratamento de respostas HTTP e erros.
- **Regra de Ouro**: Não deve conter lógica de negócio nem executar queries SQL. Deve apenas chamar métodos de serviços.

### 2. Camada de Serviços (`/src/services`)
A camada de serviços contém a "inteligência" do sistema.
- **Responsabilidades**:
  - Implementação de regras de negócio.
  - Coordenação de transações de banco de dados.
  - Integração com serviços externos (Mercado Pago, Google Gemini).
  - Orquestração de múltiplos repositórios para completar uma tarefa.
  - Gerenciamento de cache.
- **Regra de Ouro**: Não deve lidar com requisições HTTP (objetos `Context` do Hono devem ser evitados, exceto para utilitários de sessão). Deve ser agnóstica ao transporte.

### 3. Camada de Repositórios (`/src/repositories`)
A camada de repositórios é a única interface com o banco de dados.
- **Responsabilidades**:
  - Execução de queries SQL.
  - Mapeamento de resultados do banco para objetos de domínio.
  - Operações de CRUD básicas.
- **Regra de Ouro**: Não deve conter lógica de negócio. Deve apenas realizar operações de persistência e recuperação de dados.

---

## 🔄 Fluxo de Dados (Exemplo: Criação de Pedido)

1. **Rota**: `POST /api/catalog/orders` recebe o payload $\rightarrow$ Valida com `orderCreateSchema` $\rightarrow$ Chama `orderService.createOrder()`.
2. **Serviço**: `orderService.createOrder()` $\rightarrow$ Inicia transação $\rightarrow$ Chama `productRepo.findProductsByIds()` para validar estoque $\rightarrow$ Calcula totais $\rightarrow$ Chama `orderRepo.createOrder()` $\rightarrow$ Chama `productRepo.updateStock()` $\rightarrow$ Finaliza transação.
3. **Repositório**: `productRepo.updateStock()` executa `UPDATE products SET quantity = quantity - $1 WHERE id = $2`.

## 🔒 Segurança Arquitetural

- **Validação no Limite**: Toda entrada é validada via Zod antes de chegar ao serviço.
- **Transações Atômicas**: Operações que envolvem múltiplas tabelas são encapsuladas em transações no nível de serviço para evitar estados inconsistentes.
- **Isolamento de Dados**: As rotas nunca acessam o banco diretamente, impedindo que alterações no schema do banco exijam mudanças em todos os handlers de rota.
