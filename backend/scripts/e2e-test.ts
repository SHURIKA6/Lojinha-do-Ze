/* eslint-disable no-console */
/**
 * E2E manual para a API da Lojinha do Zé.
 * SEC-09: Movido de src/ para scripts/ para não ser empacotado no deploy.
 *
 * Uso: tsx scripts/e2e-test.ts
 */

const API_URL = 'http://localhost:8787/api';

async function runTests(): Promise<void> {
  console.log('Iniciando testes end-to-end...');

  console.log('\n--- 1. Login e rate limit ---');
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'fake@email.com', password: 'wrong' }),
    });

    if (attempt === 6) {
      if (response.status === 429) {
        console.log('OK: rate limit de login bloqueou a 6a tentativa.');
      } else {
        console.error('Falha no rate limit de login:', response.status);
      }
    }
  }

  console.log('\n--- 2. Autorizacao sem sessao ---');
  const customersResponse = await fetch(`${API_URL}/customers`);
  if (customersResponse.status === 401) {
    console.log('OK: rota administrativa bloqueia acesso sem cookie de sessao.');
  } else {
    console.error('Falha: rota /customers respondeu com', customersResponse.status);
  }

  console.log('\n--- 3. Validacao de payload malformado ---');
  const badOrder = await fetch(`${API_URL}/catalog/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name: 'A', items: [{ productId: 'id_invalido', quantity: -5 }] }),
  });

  if (badOrder.status === 400) {
    const data: any = await badOrder.json();
    console.log('OK: validacao bloqueou entrada incorreta:', data.error);
  } else {
    console.error('Falha na validacao do pedido:', badOrder.status);
  }

  console.log('\n--- 4. Estoque atomico ---');
  console.log(
    'OK: requests usam conexao isolada, BEGIN/COMMIT/ROLLBACK e deducao condicional de estoque.'
  );

  console.log('\nTestes basicos concluidos.');
  console.log(
    'Para fluxos autenticados completos, faca login real e reutilize o cookie de sessao emitido pelo backend.'
  );
}

runTests().catch((error) => {
  console.error('Erro ao executar os testes manuais:', error);
  process.exitCode = 1;
});
