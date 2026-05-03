/**
 * Durable Object responsável por gerenciar notificações em tempo real via WebSocket.
 * Mantém uma lista de sessões ativas e faz broadcast de mensagens para todos os clientes conectados.
 */
export class NotificationDO {
  state: any;
  env: any;
  sessions: Set<WebSocket>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  /**
   * Manipula requisições ao Durable Object.
   * - POST: Faz broadcast da mensagem para todos os WebSockets conectados.
   * - Outros: Realiza upgrade para WebSocket e adiciona à lista de sessões.
   */
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

  /**
   * Remove o WebSocket da lista de sessões quando a conexão é fechada.
   */
  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sessions.delete(ws);
  }

  /**
   * Remove o WebSocket da lista de sessões em caso de erro.
   */
  webSocketError(ws: WebSocket, error: unknown) {
    this.sessions.delete(ws);
  }
}
