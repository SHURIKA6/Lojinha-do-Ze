import { Database } from '../../core/types';
import { logger } from '../../core/utils/logger';

/**
 * Representa um pedido completo com todos os campos do banco de dados.
 */
export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  items: EnrichedOrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  tracking_code: string | null;
  delivery_type: string;
  address: string;
  payment_method: string;
  notes: string;
  discount: number;
  created_at: Date;
  updated_at: Date;
  payment_id?: string;
}

/**
 * Item básico do pedido contendo apenas ID do produto e quantidade.
 */
export interface OrderItem {
  productId: string;
  quantity: number;
}

/**
 * Item do pedido enriquecido com informações do produto (nome, preço, subtotal).
 */
export interface EnrichedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

/**
 * Dados necessários para criar um novo pedido no banco de dados.
 */
export interface OrderCreateData {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  items: EnrichedOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: string;
  address: string;
  paymentMethod: string;
  notes: string;
  discount: number;
}

/**
 * Lista pedidos com filtros opcionais de usuário e status.
 * @param client - Cliente de conexão com o banco (pode ser transação).
 * @param params - Filtros opcionais (userId, status) e paginação (limit, offset).
 * @returns Lista de pedidos com valores numéricos convertidos.
 */
export async function findOrders(
  client: Database,
  { userId, status, limit, offset }: { userId?: string; status?: string; limit: number; offset: number }
) {
  if (userId) {
    try {
      const { rows } = await client.query(
        `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at
         FROM orders
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return rows.map((row: any) => ({
        ...row,
        subtotal: parseFloat(row.subtotal) || 0,
        delivery_fee: parseFloat(row.delivery_fee) || 0,
        discount: parseFloat(row.discount) || 0,
        total: parseFloat(row.total) || 0,
      }));
    } catch (error) {
      logger.error('Erro na query findOrders (user)', error as Error, { userId, limit, offset });
      throw error;
    }
  }

  const params: (string | number | boolean | null)[] = [];
  let query = `
    SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at
    FROM orders
  `;
  if (status) {
    params.push(status);
    query += ` WHERE status = $1`;
  }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  try {
    const { rows } = await client.query(query, [...params, limit, offset]);
    return rows.map((row: any) => ({
      ...row,
      subtotal: parseFloat(row.subtotal) || 0,
      delivery_fee: parseFloat(row.delivery_fee) || 0,
      discount: parseFloat(row.discount) || 0,
      total: parseFloat(row.total) || 0,
    }));
  } catch (error) {
    logger.error('Erro na query findOrders', error as Error, { query, params: [...params, limit, offset] });
    throw error;
  }
}

/**
 * Busca um pedido pelo ID com lock FOR UPDATE para transações.
 * @param client - Cliente de conexão com o banco.
 * @param id - ID do pedido.
 * @returns Pedido encontrado ou null.
 */
export async function findOrderByIdForUpdate(client: Database, id: string) {
  const { rows } = await client.query(
    `SELECT id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at, payment_id
     FROM orders
     WHERE id = $1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Atualiza o status de um pedido e opcionalmente o código de rastreio.
 * @param client - Cliente de conexão com o banco.
 * @param id - ID do pedido.
 * @param status - Novo status.
 * @param trackingCode - Código de rastreio (opcional).
 * @returns Pedido atualizado.
 */
export async function updateOrderStatus(client: Database, id: string, status: string, trackingCode?: string) {
  let query = `UPDATE orders SET status = $1, updated_at = NOW()`;
  const params: any[] = [status, id];
  
  if (trackingCode !== undefined) {
    query += `, tracking_code = $3`;
    params.push(trackingCode);
  }
  
  query += ` WHERE id = $2 RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, tracking_code, delivery_type, address, payment_method, notes, created_at, updated_at`;

  const { rows } = await client.query(query, params);
  return rows[0] || null;
}

/**
 * Remove um pedido permanentemente do banco de dados.
 * @param client - Cliente de conexão com o banco.
 * @param id - ID do pedido a ser excluído.
 */
export async function deleteOrder(client: Database, id: string) {
  await client.query('DELETE FROM orders WHERE id = $1', [id]);
}

/**
 * Restaura o estoque de um produto e registra no log de inventário.
 * @param client - Cliente de conexão com o banco.
 * @param productId - ID do produto.
 * @param quantity - Quantidade a ser devolvida ao estoque.
 * @param productName - Nome do produto para o log.
 * @param reason - Motivo da restauração (ex: cancelamento de pedido).
 */
export async function restoreProductStock(
  client: Database,
  productId: string,
  quantity: number,
  productName: string,
  reason: string
) {
  await client.query(
    `UPDATE products
     SET quantity = quantity + $1, updated_at = NOW()
     WHERE id = $2`,
    [quantity, productId]
  );

  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     VALUES ($1, $2, 'entrada', $3, $4, NOW())`,
    [productId, productName, quantity, reason]
  );
}

/**
 * Registra uma transação financeira (receita ou despesa).
 * @param client - Cliente de conexão com o banco.
 * @param params - Dados da transação (tipo, categoria, descrição, valor, ID do pedido).
 */
export async function createTransaction(
  client: Database,
  { type, category, description, value, orderId }: { type: string; category: string; description: string; value: number; orderId: string }
) {
  await client.query(
    `INSERT INTO transactions (type, category, description, value, date, order_id)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [type, category, description, value, orderId]
  );
}

/**
 * Restaura o estoque de múltiplos produtos em lote usando unnest().
 * Também registra entradas no log de inventário.
 * @param client - Cliente de conexão com o banco.
 * @param productIds - Array de IDs dos produtos.
 * @param quantities - Array de quantidades a serem restauradas (mesmo índice).
 * @param names - Array de nomes dos produtos (para o log).
 * @param reason - Motivo da restauração.
 */
export async function restoreProductStockBulk(
  client: Database,
  productIds: number[],
  quantities: number[],
  names: string[],
  reason: string
) {
  await client.query(
    `UPDATE products AS p
     SET quantity = p.quantity + u.qty, updated_at = NOW()
     FROM unnest($1::int[], $2::int[]) AS u(id, qty)
     WHERE p.id = u.id`,
    [productIds, quantities]
  );

  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     SELECT u.id, u.name, 'entrada', u.qty, $1, NOW()
     FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
    [reason, productIds, names, quantities]
  );
}

/**
 * Busca produtos pelo array de IDs para validação de pedido.
 * Retorna apenas produtos ativos e utiliza FOR UPDATE para lock transacional.
 * @param client - Cliente de conexão com o banco.
 * @param ids - Array de IDs dos produtos.
 * @returns Produtos encontrados com id, name, sale_price, quantity.
 */
export async function findProductsByIds(client: Database, ids: number[]) {
  const { rows } = await client.query(
    `SELECT id, name, sale_price, quantity
     FROM products
     WHERE id = ANY($1) AND is_active = TRUE
     FOR UPDATE`,
    [ids]
  );
  return rows;
}

/**
 * Cria um novo pedido no banco de dados.
 * @param client - Cliente de conexão com o banco.
 * @param data - Dados completos do pedido.
 * @returns Pedido criado com os campos retornados pelo RETURNING.
 */
export async function createOrder(client: Database, data: OrderCreateData) {
  const { rows } = await client.query(
    `INSERT INTO orders (customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, delivery_type, address, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, customer_id, customer_name, customer_phone, items, subtotal, delivery_fee, discount, total, status, delivery_type, address, payment_method, notes, created_at, updated_at`,
    [
      data.customerId,
      data.customerName,
      data.customerPhone,
      JSON.stringify(data.items),
      data.subtotal,
      data.deliveryFee,
      data.discount,
      data.total,
      data.deliveryType,
      data.address,
      data.paymentMethod,
      data.notes,
    ]
  );
  return rows[0];
}

/**
 * Atualiza o estoque subtraindo as quantidades vendidas.
 * Retorna apenas produtos que tinham estoque suficiente (p.quantity >= u.qty).
 * @param client - Cliente de conexão com o banco.
 * @param productIds - Array de IDs dos produtos.
 * @param quantities - Array de quantidades vendidas.
 * @returns Produtos atualizados com novos valores de estoque e min_stock.
 */
export async function updateStock(client: Database, productIds: number[], quantities: number[]) {
  const { rows } = await client.query(
    `UPDATE products AS p
     SET quantity = p.quantity - u.qty, updated_at = NOW()
     FROM unnest($1::int[], $2::int[]) AS u(id, qty)
     WHERE p.id = u.id AND p.quantity >= u.qty
     RETURNING p.id, p.name, p.quantity, p.min_stock`,
    [productIds, quantities]
  );
  return rows;
}

/**
 * Registra saída de produtos no log de inventário em lote.
 * @param client - Cliente de conexão com o banco.
 * @param productIds - Array de IDs dos produtos.
 * @param names - Array de nomes dos produtos.
 * @param quantities - Array de quantidades retiradas.
 * @param reason - Motivo da saída (ex: "Pedido #123").
 */
export async function logInventory(client: Database, productIds: number[], names: string[], quantities: number[], reason: string) {
  await client.query(
    `INSERT INTO inventory_log (product_id, product_name, type, quantity, reason, date)
     SELECT u.id, u.name, 'saida', u.qty, $1, NOW()
     FROM unnest($2::int[], $3::text[], $4::int[]) AS u(id, name, qty)`,
    [reason, productIds, names, quantities]
  );
}
