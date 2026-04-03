import { NextResponse } from 'next/server';

export async function GET() {
  const config = `
<!DOCTYPE html>
<html>
<head>
  <title>Configurações - Lojinha do Zé</title>
  <style>
    body {
      background: #2c3e50;
      color: #ecf0f1;
      font-family: 'Courier New', monospace;
      padding: 40px;
      margin: 0;
    }
    .terminal {
      background: #34495e;
      border: 2px solid #e74c3c;
      padding: 20px;
      border-radius: 10px;
      max-width: 800px;
      margin: 0 auto;
    }
    .error {
      color: #e74c3c;
      font-size: 18px;
      margin: 10px 0;
    }
    .warning {
      background: #f39c12;
      color: #2c3e50;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .config-item {
      background: rgba(0,0,0,0.3);
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      border-left: 4px solid #e74c3c;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="terminal">
    <h1 style="color: #e74c3c; text-align: center;">⚙️ Configurações do Sistema</h1>
    
    <div class="error">[ERRO] ACESSO NEGADO!</div>
    <div class="error">[ERRO] Você não tem permissão para visualizar configurações!</div>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Tentativa de acesso não autorizado detectada!
    </div>
    
    <div class="config-item">
      <strong>DB_HOST:</strong> localhost (FALSO)
    </div>
    <div class="config-item">
      <strong>DB_USER:</strong> admin (FALSO)
    </div>
    <div class="config-item">
      <strong>DB_PASSWORD:</strong> ******** (FALSO)
    </div>
    <div class="config-item">
      <strong>JWT_SECRET:</strong> ******** (FALSO)
    </div>
    <div class="config-item">
      <strong>STATUS:</strong> HACKER DETECTADO! 🚨
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Hacker de Configurações"</p>
      <p>Mas as únicas configurações que importam são as da Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(config, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}