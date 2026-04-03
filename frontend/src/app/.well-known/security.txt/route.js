import { NextResponse } from 'next/server';

export async function GET() {
  const securityTxt = `
<!DOCTYPE html>
<html>
<head>
  <title>security.txt - Lojinha do Zé</title>
  <style>
    body {
      background: #1a1a2e;
      color: #eee;
      font-family: Arial, sans-serif;
      padding: 40px;
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .container {
      max-width: 800px;
      background: #16213e;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    h1 {
      color: #0ff;
      text-align: center;
      margin-bottom: 30px;
    }
    .security-content {
      background: #0f3460;
      padding: 30px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      line-height: 1.8;
    }
    .field {
      margin: 15px 0;
      padding: 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 5px;
    }
    .label {
      color: #0ff;
      font-weight: bold;
    }
    .value {
      color: #0f0;
    }
    .warning {
      background: #ff6b6b;
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      text-align: center;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 25px;
      border-radius: 15px;
      text-align: center;
      margin: 30px 0;
    }
    .achievement h2 {
      color: #fff;
      margin-bottom: 15px;
    }
    .achievement p {
      color: #ddd;
      margin: 10px 0;
    }
    .contact-btn {
      display: inline-block;
      background: #0ff;
      color: #000;
      padding: 15px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
      transition: all 0.3s;
    }
    .contact-btn:hover {
      background: #0f0;
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛡️ security.txt - Lojinha do Zé</h1>
    
    <div class="warning">
      🚨 <strong>VOCÊ ENCONTROU O SECURITY.TXT!</strong><br>
      Isso significa que você é um pesquisador de segurança ou um hacker super curioso!
    </div>
    
    <div class="security-content">
      <div class="field">
        <span class="label">Contact:</span><br>
        <span class="value">mailto:security@lojinha-do-ze.vercel.app</span>
      </div>
      
      <div class="field">
        <span class="label">Expires:</span><br>
        <span class="value">2026-12-31T23:59:59.000Z</span>
      </div>
      
      <div class="field">
        <span class="label">Encryption:</span><br>
        <span class="value">https://lojinha-do-ze.vercel.app/pgp-key.txt</span>
      </div>
      
      <div class="field">
        <span class="label">Preferred-Languages:</span><br>
        <span class="value">pt-BR, en</span>
      </div>
      
      <div class="field">
        <span class="label">Policy:</span><br>
        <span class="value">https://lojinha-do-ze.vercel.app/security-policy</span>
      </div>
      
      <div class="field">
        <span class="label">Hiring:</span><br>
        <span class="value">https://lojinha-do-ze.vercel.app/careers</span>
      </div>
      
      <div class="field">
        <span class="label">Acknowledgments:</span><br>
        <span class="value">https://lojinha-do-ze.vercel.app/hall-of-fame</span>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:security@lojinha-do-ze.vercel.app" class="contact-btn">
        📧 Relatar Vulnerabilidade
      </a>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
      <h3 style="color: #0ff; margin-bottom: 15px;">📋 Política de Segurança</h3>
      <p style="color: #ccc; line-height: 1.6;">
        A Lojinha do Zé leva a segurança a sério! Se você encontrou uma vulnerabilidade, 
        por favor nos informe de forma responsável. Todos os relatórios serão analisados 
        e corrigidos o mais rápido possível.
      </p>
      <p style="color: #ccc; line-height: 1.6;">
        <strong>Recompensas:</strong> Vulnerabilidades críticas podem ganhar cupons de desconto 
        para comprar na loja! 🛒
      </p>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Pesquisador de Segurança"</p>
      <p>Você encontrou o security.txt! Agora você é oficialmente um pesquisador de segurança! 🛡️</p>
      <p>Mas a melhor segurança é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; color: #666;">
      <p>P.S.: Este security.txt é tão falso que nem o PGP funciona! 😂</p>
      <p>P.P.S.: A única vulnerabilidade real é você não ter comprado na loja ainda! 💝</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(securityTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}