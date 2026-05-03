import { Bindings } from '../../core/types';

/**
 * Módulo de Entrega - Location Durable Object
 * Gerencia rastreamento de localização de entrega em tempo real usando Cloudflare Durable Objects.
 * Armazena o estado da localização e transmite atualizações para clientes WebSocket conectados.
 */

/**
 * Representa o estado de uma localização de entrega
 * @property {number | null} lat - Coordenada de latitude da localização de entrega
 * @property {number | null} lng - Coordenada de longitude da localização de entrega
 * @property {number | null} updatedAt - Timestamp da última atualização de localização em milissegundos
 */
export interface DeliveryLocationState {
  lat: number | null;
  lng: number | null;
  updatedAt: number | null;
}

/**
 * Durable Object que gerencia rastreamento de localização de entrega.
 * Manipula atualizações de localização, recupera localização atual e gerencia
 * conexões WebSocket para transmissão de localização em tempo real.
 */
export class DeliveryLocationDO {
  ctx: DurableObjectState;
  env: Bindings;
  location: DeliveryLocationState;
  sessions: Set<WebSocket>;

/**
 * Cria uma instância de DeliveryLocationDO.
 * @param {DurableObjectState} state - O estado do Durable Object para persistência de dados
 * @param {Bindings} env - Bindings de ambiente contendo configurações
 */
  constructor(state: DurableObjectState, env: Bindings) {
    this.ctx = state;
    this.env = env;
    this.location = {
      lat: null,
      lng: null,
      updatedAt: null,
    };
    this.sessions = new Set();

    // Carregamento assíncrono do estado persistido
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<DeliveryLocationState>('location');
      if (stored) {
        this.location = stored;
      }
    });
  }

/**
 * Manipula requisições HTTP recebidas pelo Durable Object.
 * Suporta atualizações de localização via POST, recuperação de localização via GET,
 * e conexões WebSocket para atualizações em tempo real.
 * @param {Request} request - A requisição HTTP recebida
 * @returns {Promise<Response>} A resposta baseada no caminho e método da requisição
 */
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/update')) {
      const body = await request.json() as { lat: number, lng: number };
      const { lat, lng } = body;
      
      this.location = { lat, lng, updatedAt: Date.now() };
      await this.ctx.storage.put('location', this.location);
      
      this.broadcast({
        type: 'location_update',
        lat: this.location.lat,
        lng: this.location.lng,
        updatedAt: this.location.updatedAt,
      });

      return new Response('Updated', { status: 200 });
    }

    if (url.pathname.endsWith('/location')) {
      return new Response(JSON.stringify(this.location), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      
      this.sessions.add(server);

      server.accept();

      server.addEventListener('close', () => {
        this.sessions.delete(server);
      });

      // Send current location immediately upon connection
      server.send(JSON.stringify({
        type: 'location_update',
        lat: this.location.lat,
        lng: this.location.lng,
        updatedAt: this.location.updatedAt,
      }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not Found', { status: 404 });
  }

/**
 * Transmite uma mensagem para todos os clientes WebSocket conectados.
 * Remove conexões fechadas automaticamente.
 * @param {any} message - A mensagem a ser transmitida para todos os clientes conectados
 */
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
