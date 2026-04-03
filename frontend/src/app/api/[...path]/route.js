import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://lojinha-do-ze-backend.riad777.workers.dev' 
    : 'http://127.0.0.1:8788');

export async function GET(request, { params }) {
  const path = params.path.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  
  const backendUrl = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;
  
  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      credentials: 'include',
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : { error: await response.text() };
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error (GET):', error);
    return NextResponse.json({ error: 'Erro ao conectar ao servidor' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const path = params.path.join('/');
  let body = {};
  
  try {
    body = await request.json();
  } catch (e) {
    console.warn('Proxy: failed to parse request body as JSON');
  }
  
  const backendUrl = `${BACKEND_URL}/api/${path}`;
  
  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : { error: await response.text() };

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error (POST):', error);
    return NextResponse.json({ error: 'Erro ao conectar ao servidor' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const path = params.path.join('/');
  const body = await request.json();
  
  const backendUrl = `${BACKEND_URL}/api/${path}`;
  
  try {
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Erro ao conectar ao servidor' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const path = params.path.join('/');
  
  const backendUrl = `${BACKEND_URL}/api/${path}`;
  
  try {
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      credentials: 'include',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Erro ao conectar ao servidor' }, { status: 500 });
  }
}