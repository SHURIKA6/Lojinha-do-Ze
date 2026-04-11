import { NextResponse } from 'next/server';

export async function GET() {
  const password = `
<!DOCTYPE html>
<html>
<head>
  <title>Gerador de Senhas - Lojinha do Zé</title>
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
    .container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      max-width: 500px;
      width: 100%;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    .password-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      border: 2px dashed #dee2e6;
    }
    .password {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      color: #495057;
      word-break: break-all;
    }
    .button {
      background: #007bff;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
      margin: 10px 0;
    }
    .button:hover {
      background: #0056b3;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Gerador de Senhas Supers</h1>
    <p>Clique no botão para gerar uma senha super segura!</p>
    
    <button class="button" onclick="generatePassword()">Gerar Senha</button>
    
    <div class="password-box">
      <div class="password" id="password">Clique no botão acima...</div>
    </div>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Esta senha é tão segura que nem você vai conseguir lembrar dela!
    </div>
    
    <div class="success">
      ✅ <strong>DICA:</strong> A senha mais segura é: <strong>"compre-na-lojinha-do-ze"</strong>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
      <p>🏆 Achievement Unlocked: "Gerador de Senhas"</p>
      <p>A melhor senha é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
  
  <script>
    function generatePassword() {
      const passwords = [
        "admin123",
        "password",
        "123456",
        "qwerty",
        "letmein",
        "welcome",
        "monkey",
        "dragon",
        "master",
        "login",
        "compre-na-lojinha-do-ze",
        "senha-segura-123",
        "nao-use-essa-senha",
        "hacker-curioso",
        "voce-nao-e-hacker"
      ];
      const randomPassword = passwords[Math.floor(Math.random() * passwords.length)];
      document.getElementById('password').textContent = randomPassword;
    }
  </script>
</body>
</html>`;

  return new NextResponse(password, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
