import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { message } = await req.json();
    
    // URL do seu Back-end no Cloudflare
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

    const response = await fetch(`${BACKEND_URL}/api/admin/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Repassa os cookies de autenticação (admin)
        'Cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy AI Error:', error);
    return NextResponse.json({ error: 'Erro ao conectar com o portal da IA.' }, 500);
  }
}
