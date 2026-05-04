import { Database, CustomerCreateData, CustomerUpdateData } from '../../core/types';
import { encryptPII, decryptPII, getPIIKey } from '../../core/utils/crypto';

// Chave de criptografia PII carregada uma única vez e reutilizada
// Isso evita gerar/importar a chave em cada operação
let piiKey: CryptoKey | null = null;

/**
 * Obtém a chave de criptografia PII, carregando-a se necessário.
 * A chave é armazenada em cache após a primeira obtenção.
 * @returns CryptoKey para criptografia/descriptografia PII.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (!piiKey) {
    piiKey = await getPIIKey();
  }
  return piiKey;
}

/**
 * Lista todos os clientes (usuários cadastrados + convidados que fizeram pedidos).
 * Utiliza UNION ALL para combinar dados de users e orders (para guests).
 * Os campos PII (email, phone, cpf, address) são descriptografados após a leitura.
 * @param db - Conexão com o banco de dados.
 * @param limit - Limite de resultados.
 * @param offset - Deslocamento para paginação.
 * @returns Lista combinada de clientes com PII descriptografada.
 */
export async function findAllCustomers(db: Database, limit: number, offset: number) {
  const { rows } = await db.query(
    `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at
     FROM (
       SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at FROM users
       UNION ALL
       SELECT
         MIN(id) as id, customer_name as name, NULL as email, customer_phone as phone,
         NULL as cpf, address, 'Cliente convidado' as notes, NULL as avatar, 'guest' as role,
         MIN(created_at) as created_at
       FROM orders
       WHERE customer_id IS NULL
       GROUP BY customer_name, customer_phone, address
     ) as combined_customers
     ORDER BY name
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  // Descriptografa os campos PII para cada cliente
  const key = await getEncryptionKey();
  const decryptedRows = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      email: row.email ? await decryptPII(row.email, key) : null,
      phone: row.phone ? await decryptPII(row.phone, key) : null,
      cpf: row.cpf ? await decryptPII(row.cpf, key) : null,
      address: row.address ? await decryptPII(row.address, key) : null,
    }))
  );
  
  return decryptedRows;
}

/**
 * Busca um cliente pelo ID, verificando primeiro na tabela users e depois em orders (para guests).
 * Os campos PII são descriptografados após a leitura.
 * @param db - Conexão com o banco de dados.
 * @param id - ID do cliente (pode ser UUID de user ou ID de pedido para guests).
 * @returns Dados do cliente com PII descriptografada ou null se não encontrado.
 */
export async function findCustomerById(db: Database, id: string) {
  const { rows: userRows } = await db.query(
    `SELECT id, name, email, phone, cpf, address, notes, avatar, role, created_at FROM users WHERE id = $1`,
    [id]
  );

  if (userRows.length) {
    // Descriptografa os campos PII
    const key = await getEncryptionKey();
    const row = userRows[0];
    return {
      ...row,
      email: row.email ? await decryptPII(row.email, key) : null,
      phone: row.phone ? await decryptPII(row.phone, key) : null,
      cpf: row.cpf ? await decryptPII(row.cpf, key) : null,
      address: row.address ? await decryptPII(row.address, key) : null,
    };
  }

  const { rows: guestRows } = await db.query(
    `SELECT MIN(id) as id, customer_name as name, null as email, customer_phone as phone,
     null as cpf, address, 'Cliente convidado' as notes, null as avatar, 'guest' as role,
     MIN(created_at) as created_at
   FROM orders
   WHERE customer_id IS NULL AND id::text = $1
   GROUP BY customer_name, customer_phone, address`,
    [id]
  );

  if (guestRows.length) {
    // Descriptografa os campos PII para convidados
    const key = await getEncryptionKey();
    const row = guestRows[0];
    return {
      ...row,
      phone: row.phone ? await decryptPII(row.phone, key) : null,
      address: row.address ? await decryptPII(row.address, key) : null,
    };
  }

  return null;
}

/**
 * Lista pedidos de um cliente (usuário cadastrado ou convidado via telefone).
 * @param db - Conexão com o banco de dados.
 * @param id - ID do cliente (users).
 * @param normalizedPhone - Telefone normalizado para busca de convidados.
 * @returns Lista de pedidos do cliente.
 */
export async function findOrdersByCustomer(db: Database, id: string, normalizedPhone: string) {
  const { rows } = await db.query(
    `SELECT id, customer_name, customer_phone, items, total, status, delivery_type, payment_method, created_at
     FROM orders
     WHERE customer_id = $1 OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2)
     ORDER BY created_at DESC`,
    [id, normalizedPhone]
  );
  return rows;
}

/**
 * Calcula estatísticas de um cliente: total gasto e quantidade de pedidos concluídos.
 * @param db - Conexão com o banco de dados.
 * @param id - ID do cliente.
 * @param normalizedPhone - Telefone normalizado para convidados.
 * @returns Objeto com total_spent e order_count.
 */
export async function getCustomerStats(db: Database, id: string, normalizedPhone: string) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(total), 0) as total_spent, COUNT(*) as order_count
     FROM orders
     WHERE (customer_id = $1 OR (customer_id IS NULL AND REGEXP_REPLACE(customer_phone, '\\D', '', 'g') = $2))
       AND status = 'concluido'`,
    [id, normalizedPhone]
  );
  return rows[0];
}

/**
 * Cria um novo cliente na tabela users.
 * Os campos PII (email, phone, cpf, address) são criptografados antes de salvar no banco.
 * @param db - Cliente de conexão (pode ser transação).
 * @param data - Dados do cliente a ser criado.
 * @returns Cliente criado com campos PII descriptografados para retorno.
 */
export async function createCustomer(db: Database, data: CustomerCreateData) {
  const key = await getEncryptionKey();
  
  // Criptografa os campos PII antes de salvar
  const encryptedEmail = data.email ? await encryptPII(data.email, key) : null;
  const encryptedPhone = data.phone ? await encryptPII(data.phone, key) : null;
  const encryptedCpf = data.cpf ? await encryptPII(data.cpf, key) : null;
  const encryptedAddress = data.address ? await encryptPII(data.address, key) : null;
  
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password, is_temporary_password, role, phone, cpf, address, notes, avatar)
     VALUES ($1, $2, NULL, false, 'customer', $3, $4, $5, $6, $7)
     RETURNING id, name, email, phone, cpf, address, notes, avatar, role, created_at`,
    [data.name, encryptedEmail, encryptedPhone, encryptedCpf, encryptedAddress, data.notes, data.avatar]
  );
  
  // Descriptografa os campos para retorno (para manter consistência na API)
  const row = rows[0];
  return {
    ...row,
    email: row.email ? await decryptPII(row.email, key) : null,
    phone: row.phone ? await decryptPII(row.phone, key) : null,
    cpf: row.cpf ? await decryptPII(row.cpf, key) : null,
    address: row.address ? await decryptPII(row.address, key) : null,
  };
}

/**
 * Atualiza os dados de um cliente existente.
 * Apenas os campos fornecidos (não nulos) serão atualizados.
 * Os campos PII são criptografados antes de salvar e descriptografados após o retorno.
 * @param db - Conexão com o banco de dados.
 * @param id - ID do cliente.
 * @param data - Novos dados do cliente.
 * @returns Cliente atualizado com PII descriptografada.
 */
export async function updateCustomer(db: Database, id: string, data: CustomerUpdateData) {
  const key = await getEncryptionKey();
  
  // Criptografa os campos PII se fornecidos
  const encryptedEmail = data.email ? await encryptPII(data.email, key) : undefined;
  const encryptedPhone = data.phone ? await encryptPII(data.phone, key) : undefined;
  const encryptedCpf = data.cpf ? await encryptPII(data.cpf, key) : undefined;
  const encryptedAddress = data.address ? await encryptPII(data.address, key) : undefined;
  
  const { rows } = await db.query(
    `UPDATE users SET
       name = COALESCE($1, name),
       email = COALESCE($2, email),
       phone = COALESCE($3, phone),
       cpf = COALESCE($4, cpf),
       address = COALESCE($5, address),
       notes = COALESCE($6, notes),
       avatar = COALESCE($7, avatar),
       updated_at = NOW()
     WHERE id = $8
     RETURNING id, name, email, phone, cpf, address, notes, avatar, role, created_at`,
    [data.name, encryptedEmail, encryptedPhone, encryptedCpf, encryptedAddress, data.notes, data.avatar, id]
  );
  
  // Descriptografa os campos para retorno
  const row = rows[0];
  return {
    ...row,
    email: row.email ? await decryptPII(row.email, key) : null,
    phone: row.phone ? await decryptPII(row.phone, key) : null,
    cpf: row.cpf ? await decryptPII(row.cpf, key) : null,
    address: row.address ? await decryptPII(row.address, key) : null,
  };
}

/**
 * Atualiza o papel (role) de um cliente.
 * @param db - Conexão com o banco de dados.
 * @param id - ID do cliente.
 * @param role - Novo papel ('admin' ou 'customer').
 * @returns Cliente com role atualizada.
 */
export async function updateCustomerRole(db: Database, id: string, role: string) {
  const { rows } = await db.query(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, role`,
    [role, id]
  );
  return rows[0];
}

/**
 * Remove um cliente da tabela users.
 * @param db - Conexão com o banco de dados.
 * @param id - ID do cliente a ser removido.
 * @returns true se o cliente foi removido, false caso contrário.
 */
export async function deleteCustomer(db: Database, id: string) {
  const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount !== null && rowCount > 0;
}

/**
 * Obtém o hash da senha de um usuário para verificação.
 * @param db - Conexão com o banco de dados.
 * @param id - ID do usuário.
 * @returns Hash da senha ou null se não encontrado.
 */
export async function getUserPassword(db: Database, id: string) {
  const { rows } = await db.query('SELECT password FROM users WHERE id = $1', [id]);
  return rows.length ? rows[0].password : null;
}
