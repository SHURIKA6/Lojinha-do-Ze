import type { Context } from 'hono';
import { SAFE_HTTP_METHODS } from '../domain/constants';

/**
 * Verifica se o método HTTP fornecido é um método seguro (não modificante).
 * Métodos seguros são definidos na constante SAFE_HTTP_METHODS e tipicamente incluem GET, HEAD, OPTIONS.
 * @param method - O método HTTP a ser verificado, pode ser undefined, null ou uma string.
 * @returns True se o método for um método HTTP seguro, false caso contrário.
 */
export function isSafeMethod(method: string | undefined | null): boolean {
  return SAFE_HTTP_METHODS.has(String(method || '').toUpperCase());
}

/**
 * Envia uma resposta de erro JSON padronizada para o cliente.
 * @param c - O objeto de contexto do Hono para a requisição atual.
 * @param status - O código de status HTTP para a resposta de erro (ex: 400, 404, 500).
 * @param error - String de mensagem de erro legível para humanos.
 * @param details - Detalhes adicionais de erro opcionais para incluir no payload da resposta.
 * @returns O objeto de resposta JSON do Hono com o payload de erro e o status especificado.
 */
export function jsonError(c: Context, status: number, error: string, details?: unknown) {
  const payload = details ? { error, details } : { error };
  return c.json(payload, status as 400 | 401 | 403 | 404 | 500);
}

/**
 * Envia uma resposta de sucesso JSON padronizada para o cliente.
 * @param c - O objeto de contexto do Hono para a requisição atual.
 * @param data - O payload de dados a ser incluído na resposta de sucesso.
 * @param status - O código de status HTTP para a resposta de sucesso, padrão é 200. Aceita 200 ou 201.
 * @returns O objeto de resposta JSON do Hono com flag de sucesso e payload de dados.
 */
export function jsonSuccess(c: Context, data: any, status: number = 200) {
  return c.json({ success: true, data }, status as 200 | 201);
}

/**
 * Aplica cabeçalhos de segurança padrão à resposta HTTP para mitigar vulnerabilidades web comuns.
 * Define os seguintes cabeçalhos:
 * - Content-Security-Policy: Restringe o carregamento de recursos à mesma origem, bloqueia scripts, permite conexões WebSocket.
 * - Referrer-Policy: Controla quanto de informação de referência é enviada com as requisições.
 * - Permissions-Policy: Desabilita acesso às APIs de câmera, microfone e geolocalização.
 * - X-Frame-Options: Impede que a página seja incorporada em iframes (proteção contra clickjacking).
 * - X-Content-Type-Options: Impede a detecção de tipo MIME.
 * - Cross-Origin-Opener-Policy: Garante que a página seja isolada de popups de origem cruzada.
 * - Strict-Transport-Security: Força HTTPS para requisições futuras (apenas definido em conexões HTTPS).
 * @param c - O objeto de contexto do Hono para a requisição/resposta atual.
 * @returns Void, modifica os cabeçalhos da resposta no local.
 */
export function applySecurityHeaders(c: Context): void {
  const headers = c.res.headers;

  if (!headers.has('Content-Security-Policy')) {
    headers.set(
      'Content-Security-Policy',
      // SEC-15: script-src 'none' explícito — API não serve HTML/scripts
      // Adicionado connect-src para permitir WebSockets (wss/ws)
      "default-src 'self'; script-src 'none'; connect-src 'self' https: wss: ws:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    );
  }

  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // SEC-14: geolocation=() — e-commerce não precisa de geolocalização
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  let isHttps = false;
  try {
    const requestUrl = new URL(c.req.url, 'http://localhost');
    isHttps = requestUrl.protocol === 'https:';
  } catch {
    // Fallback caso a análise da URL falhe
  }

  // SEC-13: Em Cloudflare Workers, c.req.url reflete o protocolo real do cliente.
  // O HSTS é setado apenas em HTTPS, o que é correto para este ambiente.
  if (isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

/**
 * Define o cabeçalho Cache-Control como 'no-store' para impedir que a resposta seja cacheada por clientes ou intermediários.
 * @param c - O objeto de contexto do Hono para a requisição atual.
 * @returns Void, modifica os cabeçalhos da resposta no local.
 */
export function setNoStore(c: Context): void {
  c.header('Cache-Control', 'no-store');
}

/**
 * Representa o resultado de uma operação de validação de dados.
 * @property success - Indica se a validação passou (true) ou falhou (false).
 * @property error - Objeto opcional contendo detalhes do erro de validação, presente apenas quando success é false.
 * @property error.issues - Array de problemas de validação encontrados durante a validação.
 * @property error.issues[].message - Mensagem legível descrevendo o problema de validação.
 */
interface ValidationResult {
  success: boolean;
  error?: {
    issues: Array<{ message: string }>;
  };
}

/**
 * Trata erros de validação retornando uma resposta de erro JSON 400 se a validação falhou.
 * Extrai a primeira mensagem de problema de validação do resultado para usar como mensagem de erro.
 * @param result - O objeto de resultado de validação contendo o status de sucesso e detalhes opcionais de erro.
 * @param c - O objeto de contexto do Hono para a requisição atual.
 * @returns Uma resposta de erro JSON se a validação falhou, undefined se a validação foi bem-sucedida.
 */
export function validationError(result: ValidationResult, c: Context) {
  if (!result.success) {
    return jsonError(c, 400, result.error?.issues[0]?.message || 'Validation error');
  }

  return undefined;
}