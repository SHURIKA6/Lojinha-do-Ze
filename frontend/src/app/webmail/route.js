import { NextResponse } from 'next/server';

export async function GET() {
  const webmail = `
<!DOCTYPE html>
<html>
<head>
  <title>Webmail - Lojinha do Zé</title>
  <style>
    body {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
      color: #1976d2;
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
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #1565c0;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      color: white;
      margin: 20px 0;
    }
    .email-list {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: left;
    }
    .email-item {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📧 Webmail - Lojinha do Zé</h1>
    
    <div class="error">
      <strong>ACESSO NEGADO!</strong><br>
      O webmail não está disponível!
    </div>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Tentativa de acesso ao webmail detectada!
    </div>
    
    <div class="email-list">
      <h3>📧 E-mails Falsos</h3>
      <div class="email-item">
        <strong>De:</strong> hacker@fake.com<br>
        <strong>Assunto:</strong> Como hackear a Lojinha do Zé<br>
        <strong>Status:</strong> <span style="color: red;">NÃO FUNCIONA</span>
      </div>
      <div class="email-item">
        <strong>De:</strong> admin@lojinha-do-ze.com<br>
        <strong>Assunto:</strong> Bem-vindo hacker curioso!<br>
        <strong>Status:</strong> <span style="color: green;">FUNCIONA</span>
      </div>
    </div>
    
    <div class="fake-login">
      <h3>Login Falso</h3>
      <input type="email" placeholder="E-mail" value="hacker@fake.com">
      <input type="password" placeholder="Senha" value="nao_vou_te_mostrar_isso">
      <button onclick="alert('Este login não funciona! 😂')">Entrar</button>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Hacker de Webmail"</p>
      <p>Mas o melhor e-mail é o da Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(webmail, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}