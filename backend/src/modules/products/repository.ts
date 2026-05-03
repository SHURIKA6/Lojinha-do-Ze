import { Database } from '../../core/types';

/**
 * Representa um produto no sistema de inventário da Lojinha do Zé.
 */
export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  photo: string;
  category: string;
  quantity: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  supplier: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Payload para criar um novo produto.
 */
export interface ProductCreatePayload {
  code: string;
  name: string;
  description: string;
  photo: string;
  category: string;
  quantity: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  supplier: string;
  is_active: boolean;
}

/**
 * Payload para atualizar um produto existente. Todos os campos são opcionais.
 */
export interface ProductUpdatePayload {
  code?: string;
  name?: string;
  description?: string;
  photo?: string;
  category?: string;
  quantity?: number;
  min_stock?: number;
  cost_price?: number;
  sale_price?: number;
  supplier?: string;
  is_active?: boolean;
}

/**
 * Lista produtos do banco de dados com paginação.
 * @param client - Instância de conexão com o banco de dados
 * @param limit - Número máximo de produtos a retornar
 * @param offset - Número de produtos a pular para paginação
 * @returns Array de registros de produtos ordenados por nome
 */
export async function listProducts(client: Database, limit: number, offset: number) {
  const { rows } = await client.query(
    `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
     FROM products
     ORDER BY name
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Pesquisa produtos no catálogo com filtros, ordenação e paginação.
 * Suporta busca de texto completo em português, filtro por categoria e filtro por faixa de preço.
 * @param client - Instância de conexão com o banco de dados
 * @param options - Opções de pesquisa incluindo termo de busca, categoria, faixa de preço, ordenação e paginação
 * @param options.search - Termo de busca de texto completo (suporta busca em português)
 * @param options.category - Filtro por categoria de produto
 * @param options.minPrice - Filtro de preço mínimo
 * @param options.maxPrice - Filtro de preço máximo
 * @param options.sortBy - Ordenação: 'price_asc', 'price_desc', 'newest' ou 'relevance'
 * @param options.limit - Número máximo de resultados a retornar
 * @param options.offset - Número de resultados a pular para paginação
 * @returns Objeto contendo as linhas de produtos que correspondem e a contagem total
 */
export async function searchProducts(
  client: Database,
  options: { 
    search?: string; 
    category?: string; 
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    limit: number; 
    offset: number;
  }
) {
  const whereClauses = ['is_active = TRUE', 'quantity > 0'];
  const queryParams: any[] = [];

  if (options.search) {
    // Generate tsquery from search term, replacing spaces with & for full text match
    const tsQuery = options.search.trim().split(/\\s+/).map(word => `${word}:*`).join(' & ');
    queryParams.push(tsQuery);
    whereClauses.push(`search_vector @@ to_tsquery('portuguese', $${queryParams.length})`);
  }

  if (options.category) {
    queryParams.push(options.category);
    whereClauses.push(`category = $${queryParams.length}`);
  }

  if (options.minPrice !== undefined) {
    queryParams.push(options.minPrice);
    whereClauses.push(`sale_price >= $${queryParams.length}`);
  }

  if (options.maxPrice !== undefined) {
    queryParams.push(options.maxPrice);
    whereClauses.push(`sale_price <= $${queryParams.length}`);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRes = await client.query(`SELECT COUNT(*) FROM products WHERE ${whereSql}`, queryParams);
  const totalCount = parseInt(countRes.rows[0].count);

  let orderBySql = 'category, name';
  if (options.sortBy === 'price_asc') orderBySql = 'sale_price ASC';
  else if (options.sortBy === 'price_desc') orderBySql = 'sale_price DESC';
  else if (options.sortBy === 'newest') orderBySql = 'created_at DESC';
  else if (options.search && options.sortBy !== 'relevance') {
    // if search exists, default to relevance (rank) if no other sort is specified
    orderBySql = `ts_rank(search_vector, to_tsquery('portuguese', $1)) DESC`;
  } else if (options.search && options.sortBy === 'relevance') {
    orderBySql = `ts_rank(search_vector, to_tsquery('portuguese', $1)) DESC`;
  }

  const limitOffsetParams = [...queryParams, options.limit, options.offset];
  const { rows } = await client.query(
    `SELECT id, code, name, description, photo, category, sale_price, quantity
     FROM products
     WHERE ${whereSql}
     ORDER BY ${orderBySql}
     LIMIT $${limitOffsetParams.length - 1} OFFSET $${limitOffsetParams.length}`,
    limitOffsetParams
  );

  return { rows, totalCount };
}


/**
 * Recupera um único produto pelo seu identificador único.
 * @param client - Instância de conexão com o banco de dados
 * @param id - Identificador único do produto (UUID)
 * @returns Objeto do produto se encontrado, null caso contrário
 */
export async function getProductById(client: Database, id: string) {
  const { rows } = await client.query(
    `SELECT id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at
     FROM products
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Cria um novo produto no banco de dados.
 * @param client - Instância de conexão com o banco de dados
 * @param p - Payload de criação do produto contendo todos os campos obrigatórios
 * @returns Novo produto criado com ID gerado e timestamps
 */
export async function createProduct(client: Database, p: ProductCreatePayload) {
  const { rows } = await client.query(
    `INSERT INTO products (code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
    [p.code, p.name, p.description, p.photo, p.category, p.quantity, p.min_stock, p.cost_price, p.sale_price, p.supplier, p.is_active]
  );
  return rows[0];
}

/**
 * Atualiza um produto existente com os campos fornecidos.
 * Apenas os campos especificados em data serão atualizados.
 * @param client - Instância de conexão com o banco de dados
 * @param id - Identificador único do produto (UUID)
 * @param data - Dados parciais do produto contendo os campos a atualizar
 * @returns Objeto do produto atualizado, ou produto atual se não houver campos para atualizar
 */
export async function updateProduct(client: Database, id: string, data: ProductUpdatePayload) {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.code !== undefined) { values.push(data.code); fields.push(`code = $${values.length}`); }
  if (data.name !== undefined) { values.push(data.name); fields.push(`name = $${values.length}`); }
  if (data.description !== undefined) { values.push(data.description); fields.push(`description = $${values.length}`); }
  if (data.photo !== undefined) { values.push(data.photo); fields.push(`photo = $${values.length}`); }
  if (data.category !== undefined) { values.push(data.category); fields.push(`category = $${values.length}`); }
  if (data.quantity !== undefined) { values.push(data.quantity); fields.push(`quantity = $${values.length}`); }
  if (data.min_stock !== undefined) { values.push(data.min_stock); fields.push(`min_stock = $${values.length}`); }
  if (data.cost_price !== undefined) { values.push(data.cost_price); fields.push(`cost_price = $${values.length}`); }
  if (data.sale_price !== undefined) { values.push(data.sale_price); fields.push(`sale_price = $${values.length}`); }
  if (data.supplier !== undefined) { values.push(data.supplier); fields.push(`supplier = $${values.length}`); }
  if (data.is_active !== undefined) { values.push(data.is_active); fields.push(`is_active = $${values.length}`); }

  if (fields.length === 0) return getProductById(client, id);

  values.push(id);
  const { rows } = await client.query(
    `UPDATE products
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, code, name, description, photo, category, quantity, min_stock, cost_price, sale_price, supplier, is_active, created_at, updated_at`,
    values
  );
  return rows[0];
}

/**
 * Exclui um produto do banco de dados pelo seu ID.
 * @param client - Instância de conexão com o banco de dados
 * @param id - Identificador único do produto (UUID)
 * @returns True se o produto foi excluído, false se não encontrado
 */
export async function deleteProduct(client: Database, id: string) {
  const { rowCount } = await client.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount !== 0;
}

/**
 * Cria um registro de transação de estoque para mudanças no inventário.
 * Usado para rastrear despesas ao adicionar estoque inicial ou reposição.
 * @param client - Instância de conexão com o banco de dados
 * @param param - Dados da transação
 * @param param.type - Tipo da transação (ex: 'despesa' para despesa)
 * @param param.category - Categoria da transação (ex: 'Compra de estoque')
 * @param param.description - Descrição da transação
 * @param param.value - Valor da transação (valor monetário)
 */
export async function createStockTransaction(client: Database, { type, category, description, value }: { type: string, category: string, description: string, value: number }) {
  await client.query(
    `INSERT INTO transactions (type, category, description, value, date)
     VALUES ($1, $2, $3, $4, NOW())`,
    [type, category, description, value]
  );
}

/**
 * Recupera um produto com bloqueio FOR UPDATE para segurança de transação.
 * Usado antes de atualizar dados do produto dentro de uma transação de banco de dados.
 * @param client - Instância de conexão com o banco de dados (deve estar em transação)
 * @param id - Identificador único do produto (UUID)
 * @returns Produto com nome, quantidade e custo se encontrado, null caso contrário
 */
export async function getProductForUpdate(client: Database, id: string) {
  const { rows } = await client.query(
    'SELECT name, quantity, cost_price FROM products WHERE id = $1 FOR UPDATE',
    [id]
  );
  return rows[0] || null;
}
