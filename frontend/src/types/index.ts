// ============================================
// Frontend Types - Lojinha do Zé
// ============================================

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'shura' | 'admin' | 'customer' | 'editor';
  phone?: string;
  cpf?: string;
  address?: Address;
  avatar?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isShura: boolean;
  isCustomer: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user?: User; error?: string; easterEgg?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
}

// ============================================
// Address Types
// ============================================

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

// ============================================
// Product Types
// ============================================

export interface Product {
  id: string;
  code?: string;
  name: string;
  description?: string;
  photo?: string;
  images?: string[];
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
  in_stock?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

// ============================================
// Order Types
// ============================================

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  photo?: string;
}

export interface Order {
  id: string;
  customer_id?: string;
  userId?: string;
  customer_name?: string;
  customer_phone?: string;
  items: OrderItem[];
  subtotal?: number;
  delivery_fee?: number;
  total: number;
  status: OrderStatus;
  delivery_type?: 'entrega' | 'retirada';
  address?: Address;
  shippingAddress?: Address;
  payment_method?: PaymentMethod;
  payment_id?: string;
  payment_status?: PaymentStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type OrderStatus = 
  | 'novo' 
  | 'recebido' 
  | 'em_preparo' 
  | 'saiu_entrega' 
  | 'concluido' 
  | 'cancelado';

export type PaymentMethod = 'pix' | 'maquininha' | 'credit_card' | 'bank_slip';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

// ============================================
// Cart Types
// ============================================

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface StoreCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

// ============================================
// API Response Types
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
  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
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