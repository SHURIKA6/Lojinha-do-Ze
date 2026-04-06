import { NextResponse, NextRequest } from 'next/server';
import { buildBackendApiUrl } from '@/lib/backend-url';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const backendUrl = buildBackendApiUrl('/admin/chat');

    const response = await fetch(backendUrl, {
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
        url: backendUrl,
        data,
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy AI Critical Error:', error);
    return NextResponse.json(
      {
        error: 'Erro ao conectar com o portal da IA.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
