import type { CustomerType, UserRole } from '../domain/roles';
import { QueryResultRow } from '@neondatabase/serverless';

// ============================================
// Types Index - Lojinha do Zé
// ============================================

// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone?: string;
  address?: Address;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  address?: string | null;
  notes?: string | null;
  avatar?: string | null;
  role: UserRole | null;
  customer_type: CustomerType;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean | null;
  total_spent?: number;
  order_count?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

// Order Types
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

// Address Types
export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

// Payment Types
export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  mercadoPagoId?: string;
  createdAt: Date;
}

export type PaymentMethod = 'pix' | 'credit_card' | 'bank_slip';

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  active: boolean;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export type NotificationType = 'order' | 'payment' | 'stock' | 'system';

// Analytics Types
export interface SalesMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  period: string;
}

export interface StockMetrics {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

// Cache Types
export interface CacheConfig {
  ttl: number;
  prefix: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

// Rate Limit Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Request Types
export interface RequestWithUser {
  user?: User;
}

// Database Types
export interface Database {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount?: number | null }>;
  connect(): Promise<Database>;
  close(): Promise<void>;
  release?(): void;
}

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
}

// Hono Types
export type Bindings = {
  DATABASE_URL: string;
  ENVIRONMENT: string;
  FRONTEND_URL?: string;
  ALLOWED_ORIGINS?: string;
  TRUST_PROXY?: string;
  JWT_SECRET?: string;
  NEXT_PUBLIC_VAPID_KEY?: string;
  [key: string]: any;
};

export type Variables = {
  db: Database;
  user?: User | null;
  session?: any;
  resolvedSession?: any;
  [key: string]: any;
};
