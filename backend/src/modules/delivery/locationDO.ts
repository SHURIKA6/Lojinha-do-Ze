import { DurableObject } from 'hono/cloudflare-workers';

export interface DeliveryLocationState {
  lat: number | null;
  lng: number | null;
  updatedAt: number | null;
}

export class DeliveryLocationDO {
  state: DeliveryLocationState;
  sessions: Set<WebSocket>;

  constructor(state: DurableObjectState, env: Bindings) {
    this.state = state.storage.get<DeliveryLocationState>('location') || {
      lat: null,
      lng: null,
      updatedAt: null,
    };
    this.sessions = new Set();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/update')) {
      const { lat, lng } = await request.json();
      this.state = { lat, lng, updatedAt: Date.now() };
      await this.state.storage.put('location', this.state);
      
      this.broadcast({
        type: 'location_update',
        lat: this.state.lat,
        lng: this.state.lng,
        updatedAt: this.state.updatedAt,
      });

      return new Response('Updated', { status: 200 });
    }

    if (url.pathname.endsWith('/location')) {
      return new Response(JSON.stringify(this.state), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = new WebSocketPair();
      this.sessions.add(server);

      server.accept();

      server.addEventListener('close', () => {
        this.sessions.delete(server);
      });

      // Send current location immediately upon connection
      server.send(JSON.stringify({
        type: 'location_update',
        lat: this.state.lat,
        lng: this.state.lng,
        updatedAt: this.state.updatedAt,
      }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not Found', { status: 404 });
  }

  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.sessions.forEach(ws => {
      try {
        ws.send(data);
      } catch (e) {
        this.sessions.delete(ws);
      }
    });
  }
}
