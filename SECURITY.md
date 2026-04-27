# Política de Segurança

## Versões Suportadas

| Versão | Suportada |
|--------|-----------|
| main   | ✅ Sim    |

## Reportando Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança neste projeto, **por favor NÃO abra uma issue pública**.

Em vez disso, envie um e-mail para o mantenedor do projeto com os seguintes detalhes:

1. **Descrição** da vulnerabilidade
2. **Passos para reproduzir** o problema
3. **Impacto potencial** (dados expostos, acesso não autorizado, etc.)
4. **Sugestão de correção**, se possível

### Tempo de Resposta

- **Confirmação de recebimento:** até 48 horas
- **Avaliação inicial:** até 7 dias
- **Correção para vulnerabilidades críticas:** até 14 dias

### O que se qualifica como vulnerabilidade

- Bypass de autenticação ou autorização
- Injeção de SQL, XSS, CSRF
- Exposição de dados sensíveis (PII, tokens, chaves)
- Escalada de privilégios
- Negação de serviço (DoS)

### O que NÃO se qualifica

- Bugs funcionais sem impacto de segurança
- Sugestões de melhorias de performance
- Problemas de UI/UX

## Práticas de Segurança Implementadas

- ✅ PBKDF2 com 100k iterações + comparação constant-time
- ✅ CSRF tokens por sessão
- ✅ Rate limiting (login: 5/15min, API: 60/min)
- ✅ CSP, HSTS, X-Frame-Options, nosniff
- ✅ CORS whitelist com origin guard
- ✅ Validação de entrada com Zod em todas as rotas
- ✅ Webhook HMAC SHA-256 (Mercado Pago)
- ✅ Queries parametrizadas (zero SQL injection surface)
- ✅ Logs sanitizados (senhas/tokens removidos)
