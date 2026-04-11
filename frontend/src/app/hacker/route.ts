import { NextResponse } from 'next/server';

export async function GET() {
  const hacker = `
<!DOCTYPE html>
<html>
<head>
  <title>Hacker Terminal - Lojinha do Zé</title>
  <style>
    body {
      background: #000;
      color: #0f0;
      font-family: 'Courier New', monospace;
      padding: 20px;
      margin: 0;
    }
    .terminal {
      background: #111;
      border: 2px solid #0f0;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 20px #0f0;
    }
    .prompt { color: #0ff; }
    .command { color: #ff0; }
    .output { color: #0f0; margin: 10px 0; }
    .error { color: #f00; }
    .success { color: #0f0; }
    .blink { animation: blink 1s infinite; }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="output">[SISTEMA] Iniciando terminal hacker...</div>
    <div class="output">[SISTEMA] Conectando ao servidor...</div>
    <div class="output">[SISTEMA] <span class="success">CONEXÃO ESTABELECIDA!</span></div>
    <br>
    <div class="prompt">root@lojinha-do-ze:~# <span class="command">./hack_the_planet.sh</span></div>
    <div class="output">[ERRO] <span class="error">Falha ao hackear o planeta!</span></div>
    <div class="output">[ERRO] <span class="error">Motivo: Você não é um hacker de verdade!</span></div>
    <br>
    <div class="prompt">root@lojinha-do-ze:~# <span class="command">sudo rm -rf /</span></div>
    <div class="output">[ERRO] <span class="error">Permissão negada!</span></div>
    <div class="output">[ERRO] <span class="error">Você não tem poderes de hacker aqui!</span></div>
    <br>
    <div class="prompt">root@lojinha-do-ze:~# <span class="command">./buy_products.sh</span></div>
    <div class="output">[SUCESSO] <span class="success">Comando aceito!</span></div>
    <div class="output">[SUCESSO] <span class="success">Redirecionando para a loja...</span></div>
    <br>
    <div class="output">🏆 Achievement Unlocked: "Hacker de Sofá"</div>
    <div class="output">Dica real: O melhor "hack" é comprar na Lojinha do Zé! 🛒</div>
    <div class="output">www.lojinha-do-ze.vercel.app</div>
    <br>
    <div class="output">P.S.: Você não é um hacker. Você é um cliente em potencial! 😂<span class="blink">_</span></div>
  </div>
</body>
</html>`;

  return new NextResponse(hacker, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
