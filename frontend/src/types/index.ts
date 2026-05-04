/**
 * Definições de Tipos Centralizadas - Lojinha do Zé
 * 
 * Este arquivo contém todas as definições de tipos TypeScript utilizadas no frontend.
 * Segue as regras: código em inglês, comentários em português.
 * Remove usos de `any` e garante consistência entre frontend e backend.
 */

import React from 'react';

// ============================================
// Address Type
// ============================================
export interface Address {
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

// ============================================
// User & Auth Types
// ============================================

export interface CustomerInvite {
  token: string;
  expires_at: string;
  used: boolean;
  setupUrl?: string;
  setupCode?: string;
  expiresAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'editor' | 'guest';
  phone?: string;
  cpf?: string;
  address?: string | Address;
  avatar?: string;
  notes?: string;
  total_spent?: number;
  order_count?: number;
  invite?: CustomerInvite;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  isCustomer: boolean;
}

// ============================================
// Product Types (compatível com backend)
// ============================================

export interface Product {
  id: string | number;
  code?: string;
  name: string;
  description?: string;
  photo?: string;
  category?: string;
  quantity?: number;
  min_stock?: number;
  cost_price?: number;
  sale_price: number;
  supplier?: string;
  is_active?: boolean;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Order Types (valores em português, compatível com backend)
// ============================================

export type OrderStatus = 'pendente' | 'processando' | 'enviado' | 'entregue' | 'cancelado';

export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'dinheiro' | 'transferencia' | 'maquininha';

export interface Order {
  id: string | number;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer?: User;
  items: Array<{
    product_id: string | number;
    product?: Product;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  payment_id?: string;
  total: number;
  delivery_type: 'retirada' | 'entrega';
  delivery_fee?: number;
  address?: string | Address;
  tracking_code?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// API Response Types (sem any)
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export interface CursorPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
    count: number;
  };
  message?: string;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'order' | 'payment' | 'stock' | 'system';
  title: string;
  message: string;
  read?: boolean;
  createdAt?: string | number | Date;
  duration?: number;
}

export interface ToastContextType {
  showToast: (payload: { type?: 'success' | 'error' | 'warning' | 'info'; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

// ============================================
// Analytics Types
// ============================================

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

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida' | 'ajuste' | 'receita' | 'despesa';
  value: number;
  description: string;
  date: string;
  category?: string;
}

// ============================================
// Form Types
// ============================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: unknown) => string | undefined;
}

// ============================================
// UI Component Types
// ============================================

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  name: string;
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

// ============================================
// Filter & Search Types
// ============================================

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================
// Utility Types
// ============================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
