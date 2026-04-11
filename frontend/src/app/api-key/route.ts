import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = `
<!DOCTYPE html>
<html>
<head>
  <title>API Keys - Lojinha do Zé</title>
  <style>
    body {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: #fff;
      font-family: Arial, sans-serif;
      padding: 40px;
      margin: 0;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .key-box {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .key {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      background: rgba(0,0,0,0.3);
      padding: 15px;
      border-radius: 5px;
      word-break: break-all;
      color: #0ff;
    }
    .button {
      background: #007bff;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      margin: 10px 5px;
    }
    .button:hover {
      background: #0056b3;
    }
    .button.danger {
      background: #dc3545;
    }
    .button.danger:hover {
      background: #c82333;
    }
    .warning {
      background: #ffc107;
      color: #212529;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .success {
      background: #28a745;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      margin: 20px 0;
      }
    .keys-list {
      display: grid;
      gap: 15px;
    }
    .key-item {
      background: rgba(255,255,255,0.05);
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    .key-item.expired {
      border-left-color: #dc3545;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔑 Gerenciador de API Keys</h1>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Todas as chaves abaixo são falsas e não funcionam!
    </div>
    
    <div class="keys-list">
      <div class="key-item">
        <h3>🔴 Chave do Stripe (Falsa)</h3>
        <div class="key">sk_test_esta_chave_nao_funciona_123456789</div>
        <p>Status: <span style="color: #ff6b6b;">INVÁLIDA</span></p>
      </div>
      
      <div class="key-item">
        <h3>🟣 Chave do Google (Falsa)</h3>
        <div class="key">AIzaSyEstaChaveNaoFunciona123456789</div>
        <p>Status: <span style="color: #ff6b6b;">INVÁLIDA</span></p>
      </div>
      
      <div class="key-item">
        <h3>🟡 Chave do Mercado Pago (Falsa)</h3>
        <div class="key">APP_USR-123456789-esta_chave_nao_funciona</div>
        <p>Status: <span style="color: #ff6b6b;">INVÁLIDA</span></p>
      </div>
      
      <div class="key-item">
        <h3>🟢 Chave do GitHub (Falsa)</h3>
        <div class="key">ghp_123456789abcdefghijEstaChaveNaoFunciona</div>
        <p>Status: <span style="color: #ff6b6b;">INVÁLIDA</span></p>
      </div>
      
      <div class="key-item expired">
        <h3>⚫ Chave Expirada (Falsa)</h3>
        <div class="key">sk_expired_123456789EstaChaveJaMorreu</div>
        <p>Status: <span style="color: #ff6b6b;">EXPIRADA</span></p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <button class="button" onclick="generateKey()">Gerar Nova Chave</button>
      <button class="button danger" onclick="revokeAll()">Revogar Todas</button>
    </div>
    
    <div class="success">
      ✅ <strong>DICA:</strong> A única chave que funciona é: <strong>"compre-na-lojinha-do-ze"</strong>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Caçador de API Keys"</p>
      <p>Mas a melhor API é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p>P.S.: Estas chaves são tão falsas que nem o Stripe aceitaria! 😂</p>
      <p>P.P.S.: A única chave real é a que abre seu coração para comprar na loja! 💝</p>
    </div>
  </div>
  
  <script>
    function generateKey() {
      const fakeKeys = [
        "sk_test_nova_chave_falsa_" + Math.random().toString(36).substr(2, 9),
        "AIzaSyNovaChaveFalsa" + Math.random().toString(36).substr(2, 9),
        "APP_USR-" + Math.floor(Math.random() * 1000000) + "-nova_chave_falsa",
        "ghp_" + Math.random().toString(36).substr(2, 20) + "ChaveFalsa"
      ];
      alert("🎉 Nova chave gerada: " + fakeKeys[Math.floor(Math.random() * fakeKeys.length)] + "\\n\\nMas ela não funciona! 😂");
    }
    
    function revokeAll() {
      alert("✅ Todas as chaves foram revogadas!\\n\\n(Na verdade, elas nunca funcionaram mesmo! 😂)");
    }
  </script>
</body>
</html>`;

  return new NextResponse(apiKey, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
