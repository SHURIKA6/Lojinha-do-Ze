import { NextResponse } from 'next/server';

export async function GET() {
  const database = `
<!DOCTYPE html>
<html>
<head>
  <title>Banco de Dados - Lojinha do Zé</title>
  <style>
    body {
      background: #2c3e50;
      color: #ecf0f1;
      font-family: 'Courier New', monospace;
      padding: 20px;
      margin: 0;
    }
    .terminal {
      background: #34495e;
      border: 2px solid #3498db;
      padding: 20px;
      border-radius: 10px;
      margin: 20px auto;
      max-width: 800px;
    }
    .sql {
      color: #f1c40f;
      font-size: 14px;
      line-height: 1.6;
    }
    .result {
      color: #2ecc71;
      margin: 10px 0;
    }
    .error {
      color: #e74c3c;
      margin: 10px 0;
    }
    .warning {
      background: #f39c12;
      color: #2c3e50;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .success {
      background: #27ae60;
      color: white;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .table {
      background: #2c3e50;
      border: 1px solid #7f8c8d;
      margin: 10px 0;
      padding: 10px;
      border-radius: 5px;
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
    <h1 style="color: #3498db; text-align: center;">💾 Terminal SQL - Lojinha do Zé</h1>
    
    <div class="sql">
      <p>mysql> <span style="color: #e74c3c;">SELECT * FROM users WHERE hacker = true;</span></p>
      <div class="error">ERROR 1045 (28000): Access denied for user 'hacker'@'localhost'</div>
      
      <p>mysql> <span style="color: #e74c3c;">DROP DATABASE lojinha_do_ze;</span></p>
      <div class="error">ERROR 1044 (42000): Access denied for user 'hacker'@'localhost' to database 'lojinha_do_ze'</div>
      
      <p>mysql> <span style="color: #e74c3c;">SHOW TABLES;</span></p>
      <div class="result">Empty set (0.00 sec)</div>
      
      <p>mysql> <span style="color: #2ecc71;">SELECT * FROM products WHERE price > 0;</span></p>
      <div class="result">+----+---------------------+--------+</div>
      <div class="result">| id | name                | price  |</div>
      <div class="result">+----+---------------------+--------+</div>
      <div class="result">| 1  | Camiseta Hacker     | 29.99  |</div>
      <div class="result">| 2  | Caneca Debug        | 19.99  |</div>
      <div class="result">| 3  | Chaveiro Segredo    | 9.99   |</div>
      <div class="result">+----+---------------------+--------+</div>
      <div class="result">3 rows in set (0.00 sec)</div>
      
      <p>mysql> <span style="color: #2ecc71;">SELECT COUNT(*) FROM hackers WHERE success = true;</span></p>
      <div class="result">+----------+</div>
      <div class="result">| COUNT(*) |</div>
      <div class="result">+----------+</div>
      <div class="result">| 0        |</div>
      <div class="result">+----------+</div>
      <div class="result">1 row in set (0.00 sec)</div>
    </div>
    
    <div class="warning">
      ⚠️ <strong>AVISO:</strong> Você não tem permissão para acessar este banco de dados!
    </div>
    
    <div class="success">
      ✅ <strong>DICA:</strong> O único SELECT que funciona é: <strong>SELECT * FROM lojinha_do_ze.products</strong>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Hacker de SQL"</p>
      <p>Mas o melhor SELECT é comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p>P.S.: Este banco de dados é tão falso que nem as tabelas existem! 😂</p>
      <p>P.P.S.: O único dado real é que você deveria comprar na loja! 🛍️</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(database, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}