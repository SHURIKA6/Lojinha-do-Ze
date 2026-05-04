/**
 * CSRF Token Management
 * 
 * Armazena e recupera o token CSRF em memória para proteger
 * requisições contra ataques Cross-Site Request Forgery.
 */

let csrfToken = '';

export function getCsrfToken(): string {
  return csrfToken;
}

export function setCsrfToken(token: string): void {
  csrfToken = token;
}
