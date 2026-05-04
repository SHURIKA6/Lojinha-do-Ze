/**
 * CSRF Token Management
 * 
 * Armazena e recupera o token CSRF em memória e via cookie para proteger
 * requisições contra ataques Cross-Site Request Forgery.
 */

let csrfToken = '';

export function getCsrfToken(): string {
  if (csrfToken) return csrfToken;
  
  // Fallback para ler do cookie caso a página tenha sido recarregada
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )lz_csrf=([^;]+)'));
    if (match) {
      csrfToken = decodeURIComponent(match[2]);
      return csrfToken;
    }
  }
  
  return '';
}

export function setCsrfToken(token: string): void {
  csrfToken = token;
}
