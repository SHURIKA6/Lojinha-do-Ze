import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionCookie = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('lz_session='));
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const sessionValue = sessionCookie.split('=')[1];
    const sessionParts = sessionValue.split('|');
    
    if (sessionParts.length < 3) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const role = sessionParts[2];
    
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Privilégios administrativos necessários.' }, { status: 403 });
    }

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
    return NextResponse.json({ error: 'Erro ao conectar com o portal da IA.' }, { status: 500 });
  }
}
