import { NextResponse } from 'next/server';

export async function GET() {
  const wpAdmin = `<!DOCTYPE html>
<html>
<head>
  <title>WordPress Admin - Lojinha do Zé</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      background: #f1f1f1; 
      margin: 0; 
      padding: 20px;
    }
    .login-form {
      background: white;
      max-width: 400px;
      margin: 50px auto;
      padding: 30px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #333; 
      text-align: center;
    }
    input {
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #0073aa;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #005a87;
    }
    .message {
      background: #ffeb3b;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="login-form">
    <h1>🔐 WordPress Admin</h1>
    <div class="message">
      ⚠️ ATENÇÃO: VOCÊ ENCONTROU O PAINEL WORDPRESS! ⚠️
    </div>
    <form>
      <input type="text" placeholder="Nome de usuário" value="admin">
      <input type="password" placeholder="Senha" value="não_vou_te_mostrar_isso">
      <button type="submit">Entrar</button>
    </form>
    <div class="message">
      <p>Se você está lendo isso, você é oficialmente um hacker curioso!</p>
      <p>Mas calma, este site não usa WordPress! 😄</p>
      <p>🏆 Achievement Unlocked: 'Caçador de WordPress'</p>
      <p>O melhor 'hack' é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(wpAdmin, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}