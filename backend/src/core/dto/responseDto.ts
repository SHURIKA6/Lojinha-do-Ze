/**
 * DTOs (Data Transfer Objects) para padronizar respostas da API
 * Garante consistência e tipagem nas respostas
 */

import type { Context } from 'hono';

// ============================================
// Interfaces Base
// ============================================

interface PaginationData {
  page: number;
  limit: number;
  total: number;
}

interface CursorPaginationData {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
  count: number;
}

interface MetaData {
  [key: string]: unknown;
}

// ============================================
// Product Types
// ============================================

interface ProductData {
  id: string;
  code?: string;
  name: string;
  description?: string;
  photo?: string;
  category: string;
  quantity?: number;
  stock?: number;
  min_stock?: number;
  cost_price?: number;
  sale_price: number;
  price?: number;
  supplier?: string;
  is_active?: boolean;
  active?: boolean;
  images?: string[];
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// Order Types
// ============================================

interface OrderItemData {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface AddressData {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface OrderData {
  id: string;
  customer_id?: string;
  userId?: string;
  customer_name?: string;
  customer_phone?: string;
  items: OrderItemData[];
  subtotal?: number;
  delivery_fee?: number;
  total: number;
  status: string;
  delivery_type?: string;
  address?: AddressData;
  shippingAddress?: AddressData;
  payment_method?: string;
  payment_id?: string;
  payment_status?: string;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// User Types
// ============================================

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  cpf?: string;
  address?: AddressData;
  avatar?: string;
  is_active?: boolean;
  active?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// Transaction Types
// ============================================

interface TransactionData {
  id: string;
  type: string;
  category: string;
  description: string;
  value: number;
  date: Date | string;
  order_id?: string;
  created_at?: Date | string;
}

// ============================================
// Session Types
// ============================================

interface SessionData {
  id: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date | string;
  last_seen_at?: Date | string;
  expires_at?: Date | string;
}

// ============================================
// DTO Classes
// ============================================

/**
 * DTO base para respostas de sucesso
 */
export class SuccessResponseDto<T = unknown> {
  readonly success: true = true;
  readonly message: string;
  readonly data: T;
  readonly timestamp: string;
  readonly meta?: MetaData;

  constructor(data: T, message: string = 'Operação realizada com sucesso', meta: MetaData | null = null) {
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
      ...(this.meta ? { meta: this.meta } : {})
    };
  }
}

/**
 * DTO base para respostas de erro
 */
export class ErrorResponseDto {
  readonly success: false = false;
  readonly message: string;
  readonly code: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly details?: unknown;

  constructor(message: string, code: string = 'INTERNAL_ERROR', details: unknown = null, statusCode: number = 500) {
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
      ...(this.details ? { details: this.details } : {})
    };
  }
}

/**
 * DTO para respostas paginadas
 */
export class PaginatedResponseDto<T = unknown> {
  readonly success: true = true;
  readonly message: string;
  readonly data: T[];
  readonly pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  readonly timestamp: string;

  constructor(data: T[], pagination: PaginationData, message: string = 'Dados recuperados com sucesso') {
    this.message = message;
    this.data = data;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    this.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
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
export class CursorPaginatedResponseDto<T = unknown> {
  readonly success: true = true;
  readonly message: string;
  readonly data: T[];
  readonly pagination: CursorPaginationData;
  readonly timestamp: string;

  constructor(data: T[], pagination: CursorPaginationData, message: string = 'Dados recuperados com sucesso') {
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
  readonly id: string;
  readonly code?: string;
  readonly name: string;
  readonly description?: string;
  readonly photo?: string;
  readonly category: string;
  readonly quantity?: number;
  readonly min_stock?: number;
  readonly cost_price?: number;
  readonly sale_price: number;
  readonly supplier?: string;
  readonly is_active?: boolean;
  readonly created_at?: Date | string;
  readonly updated_at?: Date | string;

  constructor(product: ProductData) {
    this.id = product.id;
    this.code = product.code;
    this.name = product.name;
    this.description = product.description;
    this.photo = product.photo;
    this.category = product.category;
    this.quantity = product.quantity ?? product.stock;
    this.min_stock = product.min_stock;
    this.cost_price = product.cost_price;
    this.sale_price = product.sale_price ?? product.price ?? 0;
    this.supplier = product.supplier;
    this.is_active = product.is_active ?? product.active;
    this.created_at = product.created_at ?? product.createdAt;
    this.updated_at = product.updated_at ?? product.updatedAt;
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
      in_stock: (this.quantity ?? 0) > 0
    };
  }
}

/**
 * DTO para pedidos
 */
export class OrderDto {
  readonly id: string;
  readonly customer_id?: string;
  readonly customer_name?: string;
  readonly customer_phone?: string;
  readonly items: OrderItemData[];
  readonly subtotal?: number;
  readonly delivery_fee?: number;
  readonly total: number;
  readonly status: string;
  readonly delivery_type?: string;
  readonly address?: AddressData;
  readonly payment_method?: string;
  readonly payment_id?: string;
  readonly payment_status?: string;
  readonly notes?: string;
  readonly created_at?: Date | string;
  readonly updated_at?: Date | string;

  constructor(order: OrderData) {
    this.id = order.id;
    this.customer_id = order.customer_id ?? order.userId;
    this.customer_name = order.customer_name;
    this.customer_phone = order.customer_phone;
    this.items = order.items;
    this.subtotal = order.subtotal;
    this.delivery_fee = order.delivery_fee;
    this.total = order.total;
    this.status = order.status;
    this.delivery_type = order.delivery_type;
    this.address = order.address ?? order.shippingAddress;
    this.payment_method = order.payment_method;
    this.payment_id = order.payment_id;
    this.payment_status = order.payment_status;
    this.notes = order.notes;
    this.created_at = order.created_at ?? order.createdAt;
    this.updated_at = order.updated_at ?? order.updatedAt;
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
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly phone?: string;
  readonly cpf?: string;
  readonly address?: AddressData;
  readonly avatar?: string;
  readonly is_active?: boolean;
  readonly created_at?: Date | string;
  readonly updated_at?: Date | string;

  constructor(user: UserData) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.phone = user.phone;
    this.cpf = user.cpf;
    this.address = user.address;
    this.avatar = user.avatar;
    this.is_active = user.is_active ?? user.active;
    this.created_at = user.created_at ?? user.createdAt;
    this.updated_at = user.updated_at ?? user.updatedAt;
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
  readonly id: string;
  readonly type: string;
  readonly category: string;
  readonly description: string;
  readonly value: number;
  readonly date: Date | string;
  readonly order_id?: string;
  readonly created_at?: Date | string;

  constructor(transaction: TransactionData) {
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
  readonly id: string;
  readonly user_id: string;
  readonly ip_address?: string;
  readonly user_agent?: string;
  readonly created_at?: Date | string;
  readonly last_seen_at?: Date | string;
  readonly expires_at?: Date | string;

  constructor(session: SessionData) {
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

// ============================================
// Factory para criar DTOs
// ============================================

export class DtoFactory {
  static createSuccessResponse<T>(data: T, message?: string, meta?: MetaData | null) {
    return new SuccessResponseDto<T>(data, message, meta);
  }
  
  static createErrorResponse(message: string, code?: string, details?: unknown, statusCode?: number) {
    return new ErrorResponseDto(message, code, details, statusCode);
  }
  
  static createPaginatedResponse<T>(data: T[], pagination: PaginationData, message?: string) {
    return new PaginatedResponseDto<T>(data, pagination, message);
  }
  
  static createCursorPaginatedResponse<T>(data: T[], pagination: CursorPaginationData, message?: string) {
    return new CursorPaginatedResponseDto<T>(data, pagination, message);
  }
  
  static createProductDto(product: ProductData) {
    return new ProductDto(product);
  }
  
  static createOrderDto(order: OrderData) {
    return new OrderDto(order);
  }
  
  static createUserDto(user: UserData) {
    return new UserDto(user);
  }
  
  static createTransactionDto(transaction: TransactionData) {
    return new TransactionDto(transaction);
  }
  
  static createSessionDto(session: SessionData) {
    return new SessionDto(session);
  }
}

// ============================================
// Helpers para respostas padronizadas
// ============================================

export const ResponseHelpers = {
  // Resposta de sucesso
  success<T>(c: Context, data: T, message: string = 'Operação realizada com sucesso', statusCode: number = 200, meta: MetaData | null = null) {
    const response = DtoFactory.createSuccessResponse(data, message, meta);
    return c.json(response.toJSON(), statusCode as 200);
  },
  
  // Resposta de erro
  error(c: Context, message: string, code: string = 'INTERNAL_ERROR', statusCode: 400 | 401 | 403 | 404 | 409 | 500 = 500, details: unknown = null) {
    const response = DtoFactory.createErrorResponse(message, code, details, statusCode);
    return c.json(response.toJSON(), statusCode);
  },
  
  // Resposta paginada
  paginated<T>(c: Context, data: T[], pagination: PaginationData, message: string = 'Dados recuperados com sucesso') {
    const response = DtoFactory.createPaginatedResponse(data, pagination, message);
    return c.json(response.toJSON());
  },
  
  // Resposta com cursor
  cursorPaginated<T>(c: Context, data: T[], pagination: CursorPaginationData, message: string = 'Dados recuperados com sucesso') {
    const response = DtoFactory.createCursorPaginatedResponse(data, pagination, message);
    return c.json(response.toJSON());
  },
  
  // Resposta de criação
  created<T>(c: Context, data: T, message: string = 'Recurso criado com sucesso') {
    return this.success(c, data, message, 201);
  },
  
  // Resposta de atualização
  updated<T>(c: Context, data: T, message: string = 'Recurso atualizado com sucesso') {
    return this.success(c, data, message, 200);
  },
  
  // Resposta de exclusão
  deleted(c: Context, message: string = 'Recurso excluído com sucesso') {
    return this.success(c, null, message, 200);
  },
  
  // Resposta de não encontrado
  notFound(c: Context, message: string = 'Recurso não encontrado') {
    return this.error(c, message, 'NOT_FOUND', 404);
  },
  
  // Resposta de validação
  validationError(c: Context, message: string, details: unknown = null) {
    return this.error(c, message, 'VALIDATION_ERROR', 400, details);
  },
  
  // Resposta de não autorizado
  unauthorized(c: Context, message: string = 'Não autorizado') {
    return this.error(c, message, 'UNAUTHORIZED', 401);
  },
  
  // Resposta de proibido
  forbidden(c: Context, message: string = 'Acesso negado') {
    return this.error(c, message, 'FORBIDDEN', 403);
  },
  
  // Resposta de conflito
  conflict(c: Context, message: string = 'Recurso já existe') {
    return this.error(c, message, 'CONFLICT', 409);
  }
};