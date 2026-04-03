import { NextResponse } from 'next/server';

export async function GET() {
  const robots = `
<!DOCTYPE html>
<html>
<head>
  <title>robots.txt - Lojinha do Zé</title>
  <style>
    body {
      background: #f5f5f5;
      font-family: 'Courier New', monospace;
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    .robots-content {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      font-size: 14px;
      line-height: 1.6;
    }
    .warning {
      background: #fff3cd;
      color: #856404;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .achievement {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      color: white;
      margin: 20px 0;
    }
    .disallow {
      color: #dc3545;
      font-weight: bold;
    }
    .allow {
      color: #28a745;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 robots.txt - Lojinha do Zé</h1>
    
    <div class="warning">
      ⚠️ <strong>VOCÊ ENCONTROU O ROBOTS.TXT!</strong> Isso significa que você é um robô ou um hacker curioso!
    </div>
    
    <div class="robots-content">
      <p># robots.txt - Lojinha do Zé</p>
      <p># Gerado automaticamente para hackers curiosos</p>
      <br>
      <p>User-agent: *</p>
      <p><span class="disallow">Disallow: /admin</span> # Você tentou, né?</p>
      <p><span class="disallow">Disallow: /wp-admin</span> # WordPress não existe aqui</p>
      <p><span class="disallow">Disallow: /phpmyadmin</span> # Banco de dados não disponível</p>
      <p><span class="disallow">Disallow: /config</span> # Configurações são secretas</p>
      <p><span class="disallow">Disallow: /backup.sql</span> # Backup falso</p>
      <p><span class="disallow">Disallow: /.env</span> # Credenciais falsas</p>
      <p><span class="disallow">Disallow: /secret</span> # Segredo falso</p>
      <p><span class="disallow">Disallow: /flag.txt</span> # Flag falsa</p>
      <p><span class="disallow">Disallow: /hacker</span> # Terminal falso</p>
      <p><span class="disallow">Disallow: /password</span> # Gerador de senhas</p>
      <p><span class="disallow">Disallow: /admin-panel</span> # Painel falso</p>
      <p><span class="disallow">Disallow: /database</span> # SQL falso</p>
      <p><span class="disallow">Disallow: /api-key</span> # API keys falsas</p>
      <p><span class="disallow">Disallow: /cpanel</span> # cPanel falso</p>
      <p><span class="disallow">Disallow: /webmail</span> # Webmail falso</p>
      <br>
      <p><span class="allow">Allow: /</span> # Página principal</p>
      <p><span class="allow">Allow: /loja</span> # Loja real</p>
      <p><span class="allow">Allow: /produtos</span> # Produtos reais</p>
      <br>
      <p># Dica: Compre na Lojinha do Zé! 🛒</p>
      <p># www.lojinha-do-ze.vercel.app</p>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Leitor de robots.txt"</p>
      <p>Você leu o arquivo mais boring da internet! 😂</p>
      <p>Agora vá comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}