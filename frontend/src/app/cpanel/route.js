import { NextResponse } from 'next/server';

export async function GET() {
  const cpanel = `
<!DOCTYPE html>
<html>
<head>
  <title>cPanel - Lojinha do Zé</title>
  <style>
    body {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      font-family: Arial, sans-serif;
      padding: 40px;
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    h1 {
      color: #d32f2f;
      margin-bottom: 30px;
    }
    .error {
      background: #ffebee;
      color: #c62828;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #ffcdd2;
    }
    .warning {
      background: #fff3e0;
      color: #e65100;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .fake-login {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    input {
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #b71c1c;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      color: white;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 cPanel - Lojinha do Zé</h1>
    
    <div class="error">
      <strong>ACESSO NEGADO!</strong><br>
      O cPanel não está disponível neste servidor!
    </div>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Tentativa de acesso ao cPanel detectada!
    </div>
    
    <div class="fake-login">
      <h3>Login Falso</h3>
      <input type="text" placeholder="Usuário" value="admin">
      <input type="password" placeholder="Senha" value="nao_vou_te_mostrar_isso">
      <button onclick="alert('Este login não funciona! 😂')">Entrar</button>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Hacker de cPanel"</p>
      <p>Mas o melhor painel é o da Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(cpanel, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}