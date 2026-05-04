import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy para o backend - Dashboard
 * 
 * Esta rota atua como um proxy para o backend, repassando
 * os cookies de autenticação e parâmetros de consulta.
 * Verifica se o usuário é admin antes de permitir acesso.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    
    // Verificação básica de autenticação via cookie de sessão
    const sessionCookie = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('lz_session='));
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Verificação de privilégios de administrador
    // Formato do cookie: lz_session=value|userId|role|...
    const sessionValue = sessionCookie.split('=')[1];
    if (!sessionValue) {
      return NextResponse.json({ error: 'Cookie de sessão inválido.' }, { status: 401 });
    }

    const sessionParts = sessionValue.split('|');
    if (sessionParts.length < 3) {
      return NextResponse.json({ error: 'Formato de cookie de sessão inválido.' }, { status: 401 });
    }

    const userRole = sessionParts[2].trim();
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    // URL do backend
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    
    // Repassa os query parameters (ex: ?range=30d)
    const { searchParams } = new URL(req.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/dashboard${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy Dashboard Error:', error);
    return NextResponse.json({ error: 'Erro ao conectar com o servidor de métricas.' }, { status: 500 });
  }
}
