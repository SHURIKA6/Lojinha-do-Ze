/**
 * Limpa uma string opcional, retornando null para valores vazios.
 * @param value - Valor a ser limpo.
 * @returns String limpa, null ou undefined.
 */
export function cleanOptionalString(value: any): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Limpa uma string obrigatória, retornando string vazia se inválida.
 * @param value - Valor a ser limpo.
 * @returns String sem espaços extras.
 */
export function cleanRequiredString(value: any): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Remove todos os caracteres não numéricos do telefone.
 * @param value - Telefone a ser normalizado.
 * @returns Apenas dígitos do telefone.
 */
export function normalizePhoneDigits(value: any): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

/**
 * Remove todos os caracteres não numéricos do CPF.
 * @param value - CPF a ser normalizado.
 * @returns Apenas dígitos do CPF.
 */
export function normalizeCpfDigits(value: any): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

/**
 * Valida um CPF brasileiro verificando o dígito verificador.
 * @param cpf - CPF a ser validado (com ou sem pontuação).
 * @returns true se o CPF for válido.
 */
export function isValidCpf(cpf: any): boolean {
  if (typeof cpf !== 'string') return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[10])) return false;

  return true;
}

/**
 * Valida se uma string é um UUID válido (formato padrão).
 * @param id - ID a ser validado.
 * @returns true se for um UUID válido.
 */
export function isValidUuid(id: any): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Valida se um ID é válido (UUID ou inteiro positivo).
 * Centralizado aqui para evitar duplicação entre rotas.
 */
export function isValidId(id: any): boolean {
  if (typeof id !== 'string') return false;
  return isValidUuid(id) || /^\d+$/.test(id);
}

/**
 * Normaliza um email para minúsculas e remove espaços.
 * @param value - Email a ser normalizado.
 * @returns Email normalizado ou null.
 */
export function normalizeEmail(value: any): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

/**
 * Gera um avatar a partir das iniciais do nome.
 * @param name - Nome do usuário.
 * @returns Até 2 letras maiúsculas ou 'U' como padrão.
 */
export function buildAvatar(name: any): string {
  if (typeof name !== 'string' || !name.trim()) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Verifica se um erro do banco de dados é uma violação de constraint única (PostgreSQL).
 * @param err - Erro capturado.
 * @returns true se for erro de violação única (código 23505).
 */
export function isUniqueViolation(err: any): boolean {
  return err?.code === '23505';
}

/**
 * Extrai o nome do campo que violou a constraint única a partir da mensagem de erro.
 * Usado para retornar mensagens amigáveis ao usuário.
 * @param err - Erro de violação única do PostgreSQL.
 * @returns Nome do campo (Email, Telefone, Código) ou 'Registro'.
 */
export function uniqueFieldLabel(err: any): string {
  const detail = err?.detail || '';

  if (detail.includes('(email)')) return 'E-mail';
  if (detail.includes('(phone)')) return 'Telefone';
  if (detail.includes('(code)')) return 'Código';

  return 'Registro';
}
