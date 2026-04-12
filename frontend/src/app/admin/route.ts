import { NextResponse } from 'next/server';

export async function GET() {
  const admin = `
<!DOCTYPE html>
<html>
<head>
  <title>Admin - Lojinha do Zé</title>
  <style>
    body {
      background: #1a1a1a;
      color: #ff4444;
      font-family: 'Courier New', monospace;
      padding: 40px;
      margin: 0;
      text-align: center;
    }
    .warning {
      background: #ff0000;
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-size: 24px;
      margin: 20px 0;
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .skull {
      font-size: 100px;
      margin: 20px 0;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      color: white;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="skull">💀</div>
  <div class="warning">
    ⚠️ VOCÊ TENTOU ACESSAR O /admin! ⚠️
  </div>
  <h1>ACESSO NEGADO!</h1>
  <p>Você não é admin! Você é apenas um hacker curioso!</p>
  
  <div class="achievement">
    <h2>🏆 Achievement Unlocked!</h2>
    <p>"Tentou o /admin mais óbvio da internet"</p>
    <p>Parabéns, você é o hacker mais previsível do mundo! 😂</p>
    <p>Agora vá comprar na Lojinha do Zé! 🛒</p>
    <p>www.lojinha-do-ze.vercel.app</p>
  </div>
</body>
</html>`;

  return new NextResponse(admin, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
