export class NotificationDO {
  state: any;
  env: any;
  sessions: Set<WebSocket>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request: Request) {
    // Intercept internal POST requests to broadcast to all websockets
    if (request.method === 'POST') {
      const body = await request.text();
      for (const ws of this.sessions) {
        try {
          ws.send(body);
        } catch (err) {
          this.sessions.delete(ws);
        }
      }
      return new Response('Broadcasted', { status: 200 });
    }

    // Otherwise, handle WebSocket upgrades
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    // @ts-ignore - Cloudflare Workers specific WebSocketPair
    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];

    this.state.acceptWebSocket(server);
    this.sessions.add(server);

    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: client,
    });
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sessions.delete(ws);
  }

  webSocketError(ws: WebSocket, error: unknown) {
    this.sessions.delete(ws);
  }
}
