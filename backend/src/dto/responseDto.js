/**
 * DTOs (Data Transfer Objects) para padronizar respostas da API
 * Garante consistência e tipagem nas respostas
 */

/**
 * DTO base para respostas de sucesso
 */
export class SuccessResponseDto {
  constructor(data, message = 'Operação realizada com sucesso', meta = null) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
    
    if (meta) {
      this.meta = meta;
    }
  }
  
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
      ...(this.meta && { meta: this.meta })
    };
  }
}

/**
 * DTO base para respostas de erro
 */
export class ErrorResponseDto {
  constructor(message, code = 'INTERNAL_ERROR', details = null, statusCode = 500) {
    this.success = false;
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    
    if (details) {
      this.details = details;
    }
  }
  
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * DTO para respostas paginadas
 */
export class PaginatedResponseDto {
  constructor(data, pagination, message = 'Dados recuperados com sucesso') {
    this.success = true;
    this.message = message;
    this.data = data;
    this.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    };
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      pagination: this.pagination,
      timestamp: this.timestamp
    };
  }
}

/**
 * DTO para respostas de lista com cursor
 */
export class CursorPaginatedResponseDto {
  constructor(data, pagination, message = 'Dados recuperados com sucesso') {
    this.success = true;
    this.message = message;
    this.data = data;
    this.pagination = {
      hasMore: pagination.hasMore,
      nextCursor: pagination.nextCursor,
      limit: pagination.limit,
      count: pagination.count
    };
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      pagination: this.pagination,
      timestamp: this.timestamp
    };
  }
}

/**
 * DTO para produtos
 */
export class ProductDto {
  constructor(product) {
    this.id = product.id;
    this.code = product.code;
    this.name = product.name;
    this.description = product.description;
    this.photo = product.photo;
    this.category = product.category;
    this.quantity = product.quantity;
    this.min_stock = product.min_stock;
    this.cost_price = product.cost_price;
    this.sale_price = product.sale_price;
    this.supplier = product.supplier;
    this.is_active = product.is_active;
    this.created_at = product.created_at;
    this.updated_at = product.updated_at;
  }
  
  toJSON() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      description: this.description,
      photo: this.photo,
      category: this.category,
      quantity: this.quantity,
      min_stock: this.min_stock,
      cost_price: this.cost_price,
      sale_price: this.sale_price,
      supplier: this.supplier,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
  
  // DTO para lista (campos reduzidos)
  toListDto() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      category: this.category,
      quantity: this.quantity,
      sale_price: this.sale_price,
      is_active: this.is_active
    };
  }
  
  // DTO para catálogo público
  toCatalogDto() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      photo: this.photo,
      category: this.category,
      sale_price: this.sale_price,
      in_stock: this.quantity > 0
    };
  }
}

/**
 * DTO para pedidos
 */
export class OrderDto {
  constructor(order) {
    this.id = order.id;
    this.customer_id = order.customer_id;
    this.customer_name = order.customer_name;
    this.customer_phone = order.customer_phone;
    this.items = order.items;
    this.subtotal = order.subtotal;
    this.delivery_fee = order.delivery_fee;
    this.total = order.total;
    this.status = order.status;
    this.delivery_type = order.delivery_type;
    this.address = order.address;
    this.payment_method = order.payment_method;
    this.payment_id = order.payment_id;
    this.payment_status = order.payment_status;
    this.notes = order.notes;
    this.created_at = order.created_at;
    this.updated_at = order.updated_at;
  }
  
  toJSON() {
    return {
      id: this.id,
      customer_id: this.customer_id,
      customer_name: this.customer_name,
      customer_phone: this.customer_phone,
      items: this.items,
      subtotal: this.subtotal,
      delivery_fee: this.delivery_fee,
      total: this.total,
      status: this.status,
      delivery_type: this.delivery_type,
      address: this.address,
      payment_method: this.payment_method,
      payment_id: this.payment_id,
      payment_status: this.payment_status,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
  
  // DTO para lista (campos reduzidos)
  toListDto() {
    return {
      id: this.id,
      customer_name: this.customer_name,
      total: this.total,
      status: this.status,
      delivery_type: this.delivery_type,
      payment_method: this.payment_method,
      created_at: this.created_at
    };
  }
  
  // DTO para cliente (campos públicos)
  toCustomerDto() {
    return {
      id: this.id,
      items: this.items,
      total: this.total,
      status: this.status,
      delivery_type: this.delivery_type,
      address: this.address,
      created_at: this.created_at
    };
  }
}

/**
 * DTO para usuários
 */
export class UserDto {
  constructor(user) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.phone = user.phone;
    this.cpf = user.cpf;
    this.address = user.address;
    this.avatar = user.avatar;
    this.is_active = user.is_active;
    this.created_at = user.created_at;
    this.updated_at = user.updated_at;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      phone: this.phone,
      cpf: this.cpf,
      address: this.address,
      avatar: this.avatar,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
  
  // DTO para perfil público
  toProfileDto() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      avatar: this.avatar
    };
  }
  
  // DTO para lista (campos reduzidos)
  toListDto() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      is_active: this.is_active,
      created_at: this.created_at
    };
  }
}

/**
 * DTO para transações
 */
export class TransactionDto {
  constructor(transaction) {
    this.id = transaction.id;
    this.type = transaction.type;
    this.category = transaction.category;
    this.description = transaction.description;
    this.value = transaction.value;
    this.date = transaction.date;
    this.order_id = transaction.order_id;
    this.created_at = transaction.created_at;
  }
  
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      description: this.description,
      value: this.value,
      date: this.date,
      order_id: this.order_id,
      created_at: this.created_at
    };
  }
  
  // DTO para relatórios
  toReportDto() {
    return {
      id: this.id,
      type: this.type,
      category: this.category,
      value: this.value,
      date: this.date
    };
  }
}

/**
 * DTO para sessões
 */
export class SessionDto {
  constructor(session) {
    this.id = session.id;
    this.user_id = session.user_id;
    this.ip_address = session.ip_address;
    this.user_agent = session.user_agent;
    this.created_at = session.created_at;
    this.last_seen_at = session.last_seen_at;
    this.expires_at = session.expires_at;
  }
  
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      created_at: this.created_at,
      last_seen_at: this.last_seen_at,
      expires_at: this.expires_at
    };
  }
  
  // DTO para lista (campos reduzidos)
  toListDto() {
    return {
      id: this.id,
      ip_address: this.ip_address,
      created_at: this.created_at,
      last_seen_at: this.last_seen_at
    };
  }
}

/**
 * Factory para criar DTOs
 */
export class DtoFactory {
  static createSuccessResponse(data, message, meta) {
    return new SuccessResponseDto(data, message, meta);
  }
  
  static createErrorResponse(message, code, details, statusCode) {
    return new ErrorResponseDto(message, code, details, statusCode);
  }
  
  static createPaginatedResponse(data, pagination, message) {
    return new PaginatedResponseDto(data, pagination, message);
  }
  
  static createCursorPaginatedResponse(data, pagination, message) {
    return new CursorPaginatedResponseDto(data, pagination, message);
  }
  
  static createProductDto(product) {
    return new ProductDto(product);
  }
  
  static createOrderDto(order) {
    return new OrderDto(order);
  }
  
  static createUserDto(user) {
    return new UserDto(user);
  }
  
  static createTransactionDto(transaction) {
    return new TransactionDto(transaction);
  }
  
  static createSessionDto(session) {
    return new SessionDto(session);
  }
}

/**
 * Helpers para respostas padronizadas
 */
export const ResponseHelpers = {
  // Resposta de sucesso
  success(c, data, message = 'Operação realizada com sucesso', statusCode = 200, meta = null) {
    const response = DtoFactory.createSuccessResponse(data, message, meta);
    return c.json(response.toJSON(), statusCode);
  },
  
  // Resposta de erro
  error(c, message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) {
    const response = DtoFactory.createErrorResponse(message, code, details, statusCode);
    return c.json(response.toJSON(), statusCode);
  },
  
  // Resposta paginada
  paginated(c, data, pagination, message = 'Dados recuperados com sucesso') {
    const response = DtoFactory.createPaginatedResponse(data, pagination, message);
    return c.json(response.toJSON());
  },
  
  // Resposta com cursor
  cursorPaginated(c, data, pagination, message = 'Dados recuperados com sucesso') {
    const response = DtoFactory.createCursorPaginatedResponse(data, pagination, message);
    return c.json(response.toJSON());
  },
  
  // Resposta de criação
  created(c, data, message = 'Recurso criado com sucesso') {
    return this.success(c, data, message, 201);
  },
  
  // Resposta de atualização
  updated(c, data, message = 'Recurso atualizado com sucesso') {
    return this.success(c, data, message, 200);
  },
  
  // Resposta de exclusão
  deleted(c, message = 'Recurso excluído com sucesso') {
    return this.success(c, null, message, 200);
  },
  
  // Resposta de não encontrado
  notFound(c, message = 'Recurso não encontrado') {
    return this.error(c, message, 'NOT_FOUND', 404);
  },
  
  // Resposta de validação
  validationError(c, message, details = null) {
    return this.error(c, message, 'VALIDATION_ERROR', 400, details);
  },
  
  // Resposta de não autorizado
  unauthorized(c, message = 'Não autorizado') {
    return this.error(c, message, 'UNAUTHORIZED', 401);
  },
  
  // Resposta de proibido
  forbidden(c, message = 'Acesso negado') {
    return this.error(c, message, 'FORBIDDEN', 403);
  },
  
  // Resposta de conflito
  conflict(c, message = 'Recurso já existe') {
    return this.error(c, message, 'CONFLICT', 409);
  }
};