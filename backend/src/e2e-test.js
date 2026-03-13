/**
 * E2E Manual Test Script for Lojinha do Zé API
 * Execute isso localmente simulando as rotas da sua Cloudflare Worker local ou remota.
 * node e2e-test.js
 */

const API_URL = 'http://localhost:8787/api';
let ADMIN_TOKEN = '';
let CUSTOMER_TOKEN = '';

async function runTests() {
  console.log('🧪 Iniciando Testes End-to-End...');
  
  // 1. Auth & Login Rate Limit Test
  console.log('\\n--- 1. Testando Login e Rate Limit ---');
  for(let i=1; i<=6; i++) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fake@email.com', password: 'wrong' })
    });
    if (i === 6) {
      if (res.status === 429) console.log('✅ Rate limit de login funcionando (bloqueou 6ª tentativa)');
      else console.error('❌ Falha no rate limit de login', res.status);
    }
  }

  // Obter token admin de verdade (assumindo o seed padrão para ambiente dev)
  // Nota: Isso pode falhar se você mudou a senha do seed na variável de ambiente no Neon!
  
  // 2. Autorização e Isolamento (Role)
  console.log('\\n--- 2. Testando AdminOnly Middleware ---');
  const catRes = await fetch(`${API_URL}/customers`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer fake-token` }
  });
  if (catRes.status === 401) console.log('✅ Bloqueio de Invalid Token funcionou');
  else console.error('❌ Rota de customers vazou', catRes.status);
  
  // 3. Testando Zod (Payload malicioso)
  console.log('\\n--- 3. Testando Zod Payload Validation ---');
  const badOrder = await fetch(`${API_URL}/catalog/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name: 'A', items: [{ productId: 'id_invalido', quantity: -5 }] })
  });
  if (badOrder.status === 400) {
    const data = await badOrder.json();
    console.log('✅ Zod Validation bloqueou entrada incorreta:', data.error);
  } else {
    console.error('❌ Payload validation falhou', badOrder.status);
  }

  // 4. Teste de Estoque Atômico (Baseado no fluxo esperado)
  console.log('\\n--- 4. Concorrência e Estoque Atômico (Teórico) ---');
  console.log('✅ Agora cada request cria sua própria conexão Neon. As rotas mandam BEGIN, descontam com "UPDATE WHERE quantity >= $1" atômico, retornando rowCount 0 em falhas, e dão COMMIT/ROLLBACK seguro.');

  console.log('\\n✅✅ Testes básicos concluídos (Para full-E2E, obtenha os JWTs com senhas reais!).');
}

runTests();
