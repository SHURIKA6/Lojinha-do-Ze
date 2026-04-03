import { NextResponse } from 'next/server';

export async function GET() {
  const login = `
<!DOCTYPE html>
<html>
<head>
  <title>Login - Lojinha do Zé</title>
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: Arial, sans-serif;
      padding: 40px;
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .login-box {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      max-width: 400px;
      width: 100%;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    input {
      width: 100%;
      padding: 15px;
      margin: 10px 0;
      border: 2px solid #ddd;
      border-radius: 8px;
      box-sizing: border-box;
      font-size: 16px;
    }
    button {
      width: 100%;
      padding: 15px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      margin: 10px 0;
    }
    button:hover {
      background: #0056b3;
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
      color: white;
      margin: 20px 0;
      text-align: center;
    }
    .hint {
      background: #fff3cd;
      color: #856404;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>🔐 Login Super Seguro</h1>
    
    <div class="hint">
      💡 <strong>DICA:</strong> Use usuário: <strong>"hacker"</strong> e senha: <strong>"curioso"</strong>
    </div>
    
    <form id="loginForm">
      <input type="text" id="username" placeholder="Usuário" value="hacker">
      <input type="password" id="password" placeholder="Senha" value="curioso">
      <button type="submit">Entrar</button>
    </form>
    
    <div id="result"></div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Hacker de Login"</p>
      <p>Mas o melhor login é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
  
  <script>
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      if (username === 'hacker' && password === 'curioso') {
        document.getElementById('result').innerHTML = \`
          <div class="success">
            ✅ Login realizado com sucesso!<br>
            Bem-vindo, hacker curioso!<br>
            Agora vá comprar na Lojinha do Zé! 🛒
          </div>
        \`;
      } else {
        document.getElementById('result').innerHTML = \`
          <div class="error">
            ❌ Usuário ou senha incorretos!<br>
            Tente novamente com as credenciais corretas! 😂
          </div>
        \`;
      }
    });
  </script>
</body>
</html>`;

  return new NextResponse(login, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}