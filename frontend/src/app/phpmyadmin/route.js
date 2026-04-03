import { NextResponse } from 'next/server';

export async function GET() {
  const phpmyadmin = `
<!DOCTYPE html>
<html>
<head>
  <title>phpMyAdmin - Lojinha do Zé</title>
  <style>
    body {
      background: #f5f5f5;
      font-family: Arial, sans-serif;
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    h1 {
      color: #d32f2f;
      text-align: center;
      margin-bottom: 30px;
    }
    .error {
      background: #ffebee;
      color: #c62828;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #d32f2f;
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
      text-align: center;
      color: white;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 phpMyAdmin - Lojinha do Zé</h1>
    
    <div class="error">
      <strong>ACESSO NEGADO!</strong><br>
      O phpMyAdmin não está instalado neste servidor!
    </div>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Tentativa de acesso ao phpMyAdmin detectada!
    </div>
    
    <div class="fake-login">
      <h3>Login Falso</h3>
      <input type="text" placeholder="Usuário" value="root">
      <input type="password" placeholder="Senha" value="nao_vou_te_mostrar_isso">
      <button onclick="alert('Este login não funciona! 😂')">Entrar</button>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Hacker de phpMyAdmin"</p>
      <p>Mas o melhor banco de dados é o da Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(phpmyadmin, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}