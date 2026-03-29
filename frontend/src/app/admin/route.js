import { NextResponse } from 'next/server';

export async function GET() {
  const adminPage = `<!DOCTYPE html>
<html>
<head>
  <title>Admin Panel - Lojinha do Zé</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0; 
      padding: 20px;
      min-height: 100vh;
    }
    .admin-panel {
      background: white;
      max-width: 800px;
      margin: 50px auto;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #333; 
      text-align: center;
      margin-bottom: 30px;
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-number {
      font-size: 2em;
      font-weight: bold;
      margin: 10px 0;
    }
    .message {
      background: #ffeb3b;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .secret {
      background: #f44336;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .btn {
      background: #667eea;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin: 5px;
    }
    .btn:hover {
      background: #764ba2;
    }
  </style>
</head>
<body>
  <div class="admin-panel">
    <h1>🔐 Painel Administrativo - Lojinha do Zé</h1>
    
    <div class="secret">
      ⚠️ ATENÇÃO: VOCÊ ENCONTROU O PAINEL ADMIN! ⚠️
    </div>
    
    <div class="dashboard">
      <div class="stat-card">
        <div>Vendas Hoje</div>
        <div class="stat-number">∞</div>
        <div>Clientes Felizes</div>
      </div>
      <div class="stat-card">
        <div>Hackers Curiosos</div>
        <div class="stat-number">+1</div>
        <div>Você!</div>
      </div>
      <div class="stat-card">
        <div>Vulnerabilidades</div>
        <div class="stat-number">0</div>
        <div>Tudo Seguro!</div>
      </div>
      <div class="stat-card">
        <div>Diversão</div>
        <div class="stat-number">∞</div>
        <div>Easter Eggs</div>
      </div>
    </div>
    
    <div class="message">
      <h3>Se você está lendo isso, você é oficialmente um hacker curioso!</h3>
      <p>Mas calma, este painel é falso! 😄</p>
      <p>🏆 Achievement Unlocked: 'Invasor de Painéis'</p>
      <p>O melhor 'hack' é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <button class="btn">🛒 Ir para a Loja</button>
      <button class="btn">📊 Ver Relatórios</button>
      <button class="btn">⚙️ Configurações</button>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #666;">
      <p>P.S.: Não há dados reais aqui. Apenas diversão! 😂</p>
      <p>Os números são todos infinitos porque... why not? 🤷</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(adminPage, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}