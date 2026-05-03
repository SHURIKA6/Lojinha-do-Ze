/**
 * Utilitários para Paginação Cursor-based
 * Implementação mais eficiente que offset-based para grandes datasets
 */

import { logger } from './logger.js';

interface CursorData {
  [key: string]: unknown;
}

interface PaginationOptions {
  cursor?: string | null;
  limit?: number;
  cursorFields?: string[];
  direction?: 'ASC' | 'DESC';
  params?: unknown[];
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
    count: number;
    nextPage?: string;
  };
}

interface CursorQueryResult {
  query: string;
  params: unknown[];
  paramIndex: number;
}

interface Database {
  query: (query: string, params: unknown[]) => Promise<{ rows: unknown[] }>;
}

/**
 * Gera uma string de cursor codificada em base64 a partir de um registro usando os campos de cursor especificados.
 * O cursor pode ser usado para paginação baseada em cursor.
 * @param record - O registro para gerar o cursor.
 * @param cursorFields - Os campos a incluir no cursor (padrão: ['id']).
 * @returns Uma string JSON codificada em base64 contendo os dados do cursor.
 * @throws {Error} Se algum campo de cursor não for encontrado no registro.
 */
export function generateCursor(record: Record<string, unknown>, cursorFields: string[] = ['id']): string {
  const cursorData: CursorData = {};
  
  for (const field of cursorFields) {
    if (record[field] === undefined) {
      throw new Error(`Campo ${field} não encontrado no registro`);
    }
    cursorData[field] = record[field];
  }
  
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodifica uma string de cursor codificada em base64 de volta para um objeto.
 * @param cursor - A string de cursor codificada em base64 a ser decodificada.
 * @returns Os dados do cursor decodificados como um objeto.
 * @throws {Error} Se o cursor for inválido ou não puder ser decodificado.
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded) as CursorData;
  } catch (error) {
    logger.error('Erro ao decodificar cursor', error);
    throw new Error('Cursor inválido', { cause: error });
  }
}

/**
 * Constrói uma consulta SQL com condições de paginação baseada em cursor.
 * Gera cláusulas WHERE para paginação eficiente usando campos de cursor.
 * @param baseQuery - A consulta SQL base sem paginação.
 * @param cursor - A string de cursor de uma página anterior, ou null para a primeira página.
 * @param cursorFields - Os campos usados para paginação baseada em cursor (padrão: ['id']).
 * @param direction - A direção de ordenação ('ASC' ou 'DESC', padrão: 'DESC').
 * @returns Um objeto contendo a consulta modificada, parâmetros e o próximo índice de parâmetro.
 */
export function buildCursorQuery(
  baseQuery: string,
  cursor: string | null | undefined,
  cursorFields: string[] = ['id'],
  direction: 'ASC' | 'DESC' = 'DESC'
): CursorQueryResult {
  if (!cursor) {
    return {
      query: `${baseQuery} ORDER BY ${cursorFields.map(f => `${f} ${direction}`).join(', ')} LIMIT $1`,
      params: [],
      paramIndex: 1
    };
  }
  
  const cursorData = decodeCursor(cursor);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;
  
  // Constrói condições para paginação cursor-based
  for (let i = 0; i < cursorFields.length; i++) {
    const field = cursorFields[i];
    const value = cursorData[field];
    
    if (value === undefined) {
      throw new Error(`Valor do cursor não encontrado para campo ${field}`);
    }
    
    // Para direção DESC, usa < (menor que)
    // Para direção ASC, usa > (maior que)
    const operator = direction === 'DESC' ? '<' : '>';
    
    if (i === cursorFields.length - 1) {
      // Último campo: comparação direta
      conditions.push(`${field} ${operator} $${paramIndex}`);
      params.push(value);
      paramIndex++;
    } else {
      // Campos intermediários: comparação com OR para múltiplos campos
      const subConditions: string[] = [];
      for (let j = i; j < cursorFields.length; j++) {
        const subField = cursorFields[j];
        const subValue = cursorData[subField];
        
        if (j === i) {
          subConditions.push(`${subField} ${operator} $${paramIndex}`);
          params.push(subValue);
          paramIndex++;
        } else {
          subConditions.push(`${subField} = $${paramIndex}`);
          params.push(subValue);
          paramIndex++;
        }
      }
      conditions.push(`(${subConditions.join(' AND ')})`);
    }
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
  const orderClause = `ORDER BY ${cursorFields.map(f => `${f} ${direction}`).join(', ')}`;
  
  return {
    query: `${baseQuery} ${whereClause} ${orderClause} LIMIT $${paramIndex}`,
    params: [...params],
    paramIndex: paramIndex
  };
}

/**
 * Executa uma consulta de banco de dados com paginação baseada em cursor.
 * Busca uma página de resultados e gera o próximo cursor se existirem mais resultados.
 * @param db - O objeto de banco de dados com um método query.
 * @param baseQuery - A consulta SQL base sem paginação.
 * @param options - Opções de paginação incluindo cursor, limit, cursorFields, direction e parâmetros adicionais.
 * @returns Uma Promise que resolve para o resultado paginado com dados e metadados de paginação.
 * @throws {Error} Se a consulta ao banco de dados falhar.
 */
export async function paginateWithCursor<T>(
  db: Database,
  baseQuery: string,
  options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
  const {
    cursor = null,
    limit = 20,
    cursorFields = ['id'],
    direction = 'DESC',
    params: baseParams = []
  } = options;
  
  try {
    const { query, params } = buildCursorQuery(
      baseQuery, 
      cursor, 
      cursorFields, 
      direction
    );
    
    // Adiciona parâmetros base e limite
    const finalParams = [...baseParams, ...params, limit];
    
    // Executa query
    const { rows } = await db.query(query, finalParams);
    
    // Gera próximo cursor se houver mais resultados
    let nextCursor: string | null = null;
    if (rows.length === limit) {
      const lastRecord = rows[rows.length - 1] as Record<string, unknown>;
      nextCursor = generateCursor(lastRecord, cursorFields);
    }
    
    return {
      data: rows as T[],
      pagination: {
        hasMore: rows.length === limit,
        nextCursor,
        limit,
        count: rows.length
      }
    };
  } catch (error) {
    logger.error('Erro na paginação cursor-based', error);
    throw error;
  }
}

/**
 * Cria um middleware para paginação baseada em cursor que extrai parâmetros de paginação da requisição.
 * Define as opções de paginação (cursor, limit, cursorFields, direction) no contexto.
 * @param cursorFields - Os campos a usar para paginação baseada em cursor (padrão: ['id']).
 * @param direction - A direção de ordenação ('ASC' ou 'DESC', padrão: 'DESC').
 * @returns Uma função de middleware que processa os parâmetros de paginação.
 */
export function cursorPaginationMiddleware(cursorFields: string[] = ['id'], direction: 'ASC' | 'DESC' = 'DESC') {
  return async (c: { set: (key: string, value: unknown) => void; req: { query: (key: string) => string | undefined } }, next: () => Promise<void>) => {
    const cursor = c.req.query('cursor');
    const limit = Math.min(parseInt(c.req.query('limit') || '20') || 20, 100);
    
    // Adiciona opções de paginação ao contexto
    c.set('pagination', {
      cursor,
      limit,
      cursorFields,
      direction
    });
    
    await next();
  };
}

/**
 * Cria um objeto de resposta paginada padronizado.
 * Opcionalmente gera uma URL nextPage para respostas de API.
 * @param data - O array de itens de dados para a página atual.
 * @param pagination - Os metadados de paginação de uma consulta baseada em cursor.
 * @param baseUrl - A URL base para gerar o link nextPage (padrão: '').
 * @returns Uma resposta paginada completa com dados e informações de paginação.
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationResult<T>['pagination'],
  baseUrl: string = ''
): PaginationResult<T> {
  const response: PaginationResult<T> = {
    data,
    pagination: {
      hasMore: pagination.hasMore,
      limit: pagination.limit,
      count: pagination.count,
      nextCursor: pagination.nextCursor
    }
  };
  
  if (pagination.nextCursor) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    response.pagination.nextPage = `${baseUrl}${separator}cursor=${encodeURIComponent(pagination.nextCursor)}&limit=${pagination.limit}`;
  }
  
  return response;
}

/**
 * Converte paginação baseada em offset para paginação baseada em cursor.
 * Encontra o registro na posição do offset e gera um cursor a partir dele.
 * @param db - O objeto de banco de dados com um método query.
 * @param baseQuery - A consulta SQL base sem paginação.
 * @param offset - O offset de base zero a ser convertido para um cursor.
 * @param limit - O número máximo de registros a retornar.
 * @param cursorFields - Os campos a usar para geração do cursor (padrão: ['id']).
 * @returns Uma Promise que resolve para um objeto contendo o cursor, dados e metadados de paginação.
 */
export async function convertOffsetToCursor<T>(
  db: Database,
  baseQuery: string,
  offset: number,
  limit: number,
  cursorFields: string[] = ['id']
): Promise<{ cursor: string | null; data: T[]; pagination: PaginationResult<T>['pagination'] }> {
  try {
    // Primeiro, pega o registro na posição do offset
    const offsetQuery = `${baseQuery} ORDER BY ${cursorFields.join(', ')} LIMIT 1 OFFSET $1`;
    const { rows: offsetRows } = await db.query(offsetQuery, [offset]);
    
    if (offsetRows.length === 0) {
      return {
        cursor: null,
        data: [],
        pagination: {
          hasMore: false,
          nextCursor: null,
          limit,
          count: 0
        }
      };
    }
    
    // Gera cursor a partir do registro do offset
    const cursor = generateCursor(offsetRows[0] as Record<string, unknown>, cursorFields);
    
    // Usa cursor para buscar os próximos registros
    const result = await paginateWithCursor<T>(db, baseQuery, {
      cursor,
      limit,
      cursorFields
    });
    
    return {
      cursor,
      ...result
    };
  } catch (error) {
    logger.error('Erro ao converter offset para cursor', error);
    throw error;
  }
}

/**
 * Valida parâmetros de paginação para paginação baseada em cursor.
 * Verifica se o cursor é uma string (se fornecido) e se o limit está entre 1 e 100.
 * @param cursor - A string de cursor a validar (pode ser null ou undefined).
 * @param limit - O valor de limit a validar.
 * @returns Um objeto com uma flag valid e um array de mensagens de erro.
 */
export function validatePaginationParams(cursor: string | null | undefined, limit: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (cursor && typeof cursor !== 'string') {
    errors.push('Cursor deve ser uma string');
  }
  
  if (limit !== undefined) {
    const parsedLimit = parseInt(String(limit));
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push('Limit deve ser um número entre 1 e 100');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Placeholder de hook para paginação baseada em cursor no frontend React.
 * Esta função lança um erro se for chamada, pois deve ser usada apenas no frontend.
 * @param _initialOptions - Opções iniciais de paginação (não usado no backend).
 * @throws {Error} Sempre lança um erro indicando que deve ser usado apenas no frontend React.
 */
export function useCursorPagination(_initialOptions: Record<string, unknown> = {}) {
  // Este hook é apenas um placeholder para uso no frontend
  // No backend, use as funções utilitárias diretamente
  throw new Error('useCursorPagination deve ser usado apenas no frontend React');
}