import { NextResponse } from 'next/server';

export async function GET() {
  const adminPanel = `
<!DOCTYPE html>
<html>
<head>
  <title>Painel Admin - Lojinha do Zé</title>
  <style>
    body {
      background: #1a1a2e;
      color: #eee;
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: #16213e;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #0f3460;
    }
    .card h3 {
      color: #e94560;
      margin-top: 0;
    }
    .stat {
      font-size: 2em;
      font-weight: bold;
      color: #0ff;
    }
    .fake-data {
      background: #0f3460;
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    .error {
      background: #ff6b6b;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .success {
      background: #51cf66;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1 style="text-align: center; color: #e94560;">🔐 Painel Admin Secreto</h1>
  
  <div class="error">
    ⚠️ <strong>ACESSO NEGADO!</strong> Você não é admin! ⚠️
  </div>
  
  <div class="dashboard">
    <div class="card">
      <h3>📊 Vendas Falsas</h3>
      <div class="stat">R$ 0,00</div>
      <div class="fake-data">
        <p>Produtos vendidos: 0</p>
        <p>Clientes felizes: 0</p>
        <p>Hackers frustrados: 1 (você!)</p>
      </div>
    </div>
    
    <div class="card">
      <h3>👥 Usuários Falsos</h3>
      <div class="stat">0</div>
      <div class="fake-data">
        <p>Admins reais: 0</p>
        <p>Hackers curiosos: 1</p>
        <p>Pessoas comprando: ∞</p>
      </div>
    </div>
    
    <div class="card">
      <h3>🛡️ Segurança</h3>
      <div class="stat">100%</div>
      <div class="fake-data">
        <p>Tentativas de hack: 1</p>
        <p>Sucessos: 0</p>
        <p>Divisão por zero: ERRO</p>
      </div>
    </div>
    
    <div class="card">
      <h3>💰 Lucro Falso</h3>
      <div class="stat">R$ ∞</div>
      <div class="fake-data">
        <p>Receita: Muita</p>
        <p>Despesa: Pouca</p>
        <p>Hackers: R$ 0</p>
      </div>
    </div>
  </div>
  
  <div class="success">
    ✅ <strong>PARABÉNS!</strong> Você encontrou o painel mais inútil da internet!
  </div>
  
  <div class="achievement">
    <h2>🏆 Achievement Unlocked!</h2>
    <p>"Caçador de Painéis Admin"</p>
    <p>Mas sério, vá comprar na Lojinha do Zé! 🛒</p>
    <p>www.lojinha-do-ze.vercel.app</p>
  </div>
  
  <div style="text-align: center; margin-top: 30px;">
    <p>P.S.: Este painel é tão falso que nem os dados são reais! 😂</p>
    <p>P.P.S.: O único dado real é que você deveria comprar na loja! 🛍️</p>
  </div>
</body>
</html>`;

  return new NextResponse(adminPanel, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}