import { NextResponse } from 'next/server';

export async function GET() {
  const debugInfo = `{
  "status": "🚨 DEBUG MODE ATIVADO 🚨",
  "message": "VOCÊ ENCONTROU O ENDPOINT DE DEBUG!",
  "timestamp": "${new Date().toISOString()}",
  "server": {
    "name": "Lojinha do Zé",
    "version": "1.0.0",
    "environment": "production",
    "uptime": "∞",
    "memory": "∞",
    "cpu": "∞"
  },
  "database": {
    "status": "connected",
    "host": "localhost",
    "port": 5432,
    "name": "lojinha_do_ze",
    "user": "admin",
    "password": "não_vou_te_mostrar_isso"
  },
  "api_keys": {
    "stripe": "sk_test_não_é_real",
    "openai": "sk-tambem_não_é_real",
    "github": "ghp_não_é_real"
  },
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@lojinha-do-ze.com",
      "role": "admin",
      "password": "não_vou_te_mostrar_isso"
    },
    {
      "id": 2,
      "username": "ze",
      "email": "ze@lojinha-do-ze.com",
      "role": "owner",
      "password": "não_vou_te_mostrar_isso"
    }
  ],
  "secrets": {
    "jwt_secret": "não_vou_te_mostrar_isso",
    "session_key": "não_vou_te_mostrar_isso",
    "encryption_key": "não_vou_te_mostrar_isso"
  },
  "vulnerabilities": [
    "SQL Injection: Não funcionaria aqui",
    "XSS: Protegido pelo React",
    "CSRF: Protegido pelo Next.js",
    "Auth Bypass: Não vai funcionar"
  ],
  "achievements": [
    "🏆 Achievement Unlocked: 'Caçador de Debug'",
    "🔍 Achievement Unlocked: 'Investigador de APIs'",
    "🎯 Achievement Unlocked: 'Explorador de Endpoints'"
  ],
  "warning": "⚠️ Este é um endpoint falso para pegar hackers curiosos! ⚠️",
  "real_message": "Se você está lendo isso, você é oficialmente um hacker curioso!",
  "recommendation": "O melhor 'hack' é comprar na Lojinha do Zé! 🛒",
  "website": "www.lojinha-do-ze.vercel.app",
  "ps": "Não há vulnerabilidades reais aqui. Apenas diversão! 😂"
}`;

  return new NextResponse(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}