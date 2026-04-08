# Changelog - Lojinha do Zé

Todas as mudanças notáveis para este projeto serão documentadas neste arquivo.

## [1.0.0] - 2026-04-08

### Segurança 🔐

- Migração da lógica de "Easter Eggs" para o backend para evitar exposição de emails no bundle cliente.
- Remoção de variáveis `NEXT_PUBLIC_EASTER_EMAIL` e `NEXT_PUBLIC_SHURA_EMAIL`.
- Travamento de versões de dependências em `package.json` para maior estabilidade em produção.
- Implementação de middleware de sanitização e rate limiting (anterior).

### DevOps ⚙️

- Adicionado arquivo `.nvmrc` fixando a versão do Node.js em 20.0.0.
- Configuração de Husky e lint-staged para garantir qualidade de código no commit (anterior).
- Estruturação de Docker Compose para ambiente local (anterior).

### Código & Performance 💻

- Implementação de Code-splitting/Lazy Loading para componentes pesados como `leaflet`.
- Refatoração da arquitetura movendo schemas compartilhados para o domínio do backend.
- Padronização de respostas da API com `jsonSuccess` e `jsonError`.

### Documentação 📚

- Documentação completa no `README.md`.
- Especificação OpenAPI/Swagger implementada em `openapi.yml`.
- Este `CHANGELOG.md` foi adicionado.

---
*Gerado automaticamente em conformidade com a auditoria técnica de Abril de 2026.*
