import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
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

    const data = await response.json().catch(() => ({ error: 'Resposta do backend não é um JSON válido.' }));
    
    if (!response.ok) {
      console.error('AI Backend Error:', {
        status: response.status,
        url: `${BACKEND_URL}/api/admin/chat`,
        data
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy AI Critical Error:', error);
    return NextResponse.json(
      { error: 'Erro ao conectar com o portal da IA.', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}
