import { NextResponse } from 'next/server';

export async function GET() {
  const sitemap = `
<!DOCTYPE html>
<html>
<head>
  <title>sitemap.xml - Lojinha do Zé</title>
  <style>
    body {
      background: #f5f5f5;
      font-family: Arial, sans-serif;
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
    .xml-content {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      overflow-x: auto;
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
    .tag { color: #0066cc; }
    .attr { color: #cc0000; }
    .value { color: #009900; }
    .comment { color: #666; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🗺️ sitemap.xml - Lojinha do Zé</h1>
    
    <div class="warning">
      ⚠️ <strong>VOCÊ ENCONTROU O SITEMAP.XML!</strong> Isso significa que você é um robô de SEO ou um hacker curioso!
    </div>
    
    <div class="xml-content">
      <span class="comment"><!-- sitemap.xml - Lojinha do Zé --></span><br>
      <span class="comment"><!-- Gerado para hackers curiosos --></span><br>
      <span class="tag"><urlset</span> <span class="attr">xmlns</span>=<span class="value">"http://www.sitemaps.org/schemas/sitemap/0.9"</span><span class="tag">></span><br>
      <br>
      <span class="comment"><!-- Páginas que existem de verdade --></span><br>
      <span class="tag"><url></span><br>
      &nbsp;&nbsp;<span class="tag"><loc></span><span class="value">https://lojinha-do-ze.vercel.app/</span><span class="tag"></loc></span><br>
      &nbsp;&nbsp;<span class="tag"><changefreq></span>daily<span class="tag"></changefreq></span><br>
      &nbsp;&nbsp;<span class="tag"><priority></span>1.0<span class="tag"></priority></span><br>
      <span class="tag"></url></span><br>
      <br>
      <span class="tag"><url></span><br>
      &nbsp;&nbsp;<span class="tag"><loc></span><span class="value">https://lojinha-do-ze.vercel.app/loja</span><span class="tag"></loc></span><br>
      &nbsp;&nbsp;<span class="tag"><changefreq></span>daily<span class="tag"></changefreq></span><br>
      &nbsp;&nbsp;<span class="tag"><priority></span>0.9<span class="tag"></priority></span><br>
      <span class="tag"></url></span><br>
      <br>
      <span class="comment"><!-- Páginas falsas para hackers --></span><br>
      <span class="tag"><url></span><br>
      &nbsp;&nbsp;<span class="tag"><loc></span><span class="value">https://lojinha-do-ze.vercel.app/admin</span><span class="tag"></loc></span><br>
      &nbsp;&nbsp;<span class="tag"><changefreq></span>never<span class="tag"></changefreq></span><br>
      &nbsp;&nbsp;<span class="tag"><priority></span>0.0<span class="tag"></priority></span><br>
      <span class="tag"></url></span><br>
      <br>
      <span class="tag"><url></span><br>
      &nbsp;&nbsp;<span class="tag"><loc></span><span class="value">https://lojinha-do-ze.vercel.app/wp-admin</span><span class="tag"></loc></span><br>
      &nbsp;&nbsp;<span class="tag"><changefreq></span>never<span class="tag"></changefreq></span><br>
      &nbsp;&nbsp;<span class="tag"><priority></span>0.0<span class="tag"></priority></span><br>
      <span class="tag"></url></span><br>
      <br>
      <span class="tag"><url></span><br>
      &nbsp;&nbsp;<span class="tag"><loc></span><span class="value">https://lojinha-do-ze.vercel.app/secret</span><span class="tag"></loc></span><br>
      &nbsp;&nbsp;<span class="tag"><changefreq></span>never<span class="tag"></changefreq></span><br>
      &nbsp;&nbsp;<span class="tag"><priority></span>0.0<span class="tag"></priority></span><br>
      <span class="tag"></url></span><br>
      <br>
      <span class="tag"></urlset></span><br>
      <br>
      <span class="comment"><!-- Dica: Compre na Lojinha do Zé! 🛒 --></span><br>
      <span class="comment"><!-- www.lojinha-do-ze.vercel.app --></span>
    </div>
    
    <div class="achievement">
      <h2>🏆 Achievement Unlocked!</h2>
      <p>"Leitor de sitemap.xml"</p>
      <p>Você leu o arquivo mais técnico da internet! 😂</p>
      <p>Agora vá comprar na Lojinha do Zé! 🛒</p>
      <p>www.lojinha-do-ze.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}