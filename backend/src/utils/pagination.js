/**
 * Utilitários para Paginação Cursor-based
 * Implementação mais eficiente que offset-based para grandes datasets
 */

import { logger } from './logger.js';

/**
 * Gera cursor a partir de um registro
 */
export function generateCursor(record, cursorFields = ['id']) {
  const cursorData = {};
  
  for (const field of cursorFields) {
    if (record[field] === undefined) {
      throw new Error(`Campo ${field} não encontrado no registro`);
    }
    cursorData[field] = record[field];
  }
  
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodifica cursor para objeto
 */
export function decodeCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    logger.error('Erro ao decodificar cursor', error);
    throw new Error('Cursor inválido', { cause: error });
  }
}

/**
 * Constrói query SQL com paginação cursor-based
 */
export function buildCursorQuery(baseQuery, cursor, cursorFields = ['id'], direction = 'DESC') {
  if (!cursor) {
    return {
      query: `${baseQuery} ORDER BY ${cursorFields.map(f => `${f} ${direction}`).join(', ')} LIMIT $1`,
      params: [],
      paramIndex: 1
    };
  }
  
  const cursorData = decodeCursor(cursor);
  const conditions = [];
  const params = [];
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
      const subConditions = [];
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
 * Wrapper para queries com paginação cursor-based
 */
export async function paginateWithCursor(db, baseQuery, options = {}) {
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
    let nextCursor = null;
    if (rows.length === limit) {
      const lastRecord = rows[rows.length - 1];
      nextCursor = generateCursor(lastRecord, cursorFields);
    }
    
    return {
      data: rows,
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
 * Middleware para paginação cursor-based
 */
export function cursorPaginationMiddleware(cursorFields = ['id'], direction = 'DESC') {
  return async (c, next) => {
    const cursor = c.req.query('cursor');
    const limit = Math.min(parseInt(c.req.query('limit')) || 20, 100);
    
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
 * Helper para respostas paginadas
 */
export function createPaginatedResponse(data, pagination, baseUrl = '') {
  const response = {
    data,
    pagination: {
      hasMore: pagination.hasMore,
      limit: pagination.limit,
      count: pagination.count
    }
  };
  
  if (pagination.nextCursor) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    response.pagination.nextPage = `${baseUrl}${separator}cursor=${encodeURIComponent(pagination.nextCursor)}&limit=${pagination.limit}`;
  }
  
  return response;
}

/**
 * Converte paginação offset-based para cursor-based
 */
export async function convertOffsetToCursor(db, baseQuery, offset, limit, cursorFields = ['id']) {
  try {
    // Primeiro, pega o registro na posição do offset
    const offsetQuery = `${baseQuery} ORDER BY ${cursorFields.join(', ')} LIMIT 1 OFFSET $1`;
    const { rows: offsetRows } = await db.query(offsetQuery, [offset]);
    
    if (offsetRows.length === 0) {
      return {
        cursor: null,
        data: []
      };
    }
    
    // Gera cursor a partir do registro do offset
    const cursor = generateCursor(offsetRows[0], cursorFields);
    
    // Usa cursor para buscar os próximos registros
    const result = await paginateWithCursor(db, baseQuery, {
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
 * Valida parâmetros de paginação
 */
export function validatePaginationParams(cursor, limit) {
  const errors = [];
  
  if (cursor && typeof cursor !== 'string') {
    errors.push('Cursor deve ser uma string');
  }
  
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit);
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
 * Paginação cursor-based para React (hook)
 * Nota: Este hook deve ser usado apenas no frontend
 */
export function useCursorPagination(_initialOptions = {}) {
  // Este hook é apenas um placeholder para uso no frontend
  // No backend, use as funções utilitárias diretamente
  throw new Error('useCursorPagination deve ser usado apenas no frontend React');
}
