/* ============================================
   LOJINHA DO ZÉ - Database Utility (localStorage)
   ============================================ */

const DB_PREFIX = 'lojinha_';
const SEED_KEY = DB_PREFIX + 'seeded';

// ============================================
// Generic CRUD operations
// ============================================
export function getAll(entity) {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(DB_PREFIX + entity);
  return data ? JSON.parse(data) : [];
}

export function getById(entity, id) {
  const items = getAll(entity);
  return items.find(item => item.id === id) || null;
}

export function create(entity, item) {
  const items = getAll(entity);
  const newItem = {
    ...item,
    id: item.id || generateId(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(newItem);
  localStorage.setItem(DB_PREFIX + entity, JSON.stringify(items));
  return newItem;
}

export function update(entity, id, updates) {
  const items = getAll(entity);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(DB_PREFIX + entity, JSON.stringify(items));
  return items[index];
}

export function remove(entity, id) {
  const items = getAll(entity);
  const filtered = items.filter(item => item.id !== id);
  localStorage.setItem(DB_PREFIX + entity, JSON.stringify(filtered));
  return filtered;
}

export function query(entity, filterFn) {
  return getAll(entity).filter(filterFn);
}

function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// Seed Data
// ============================================
export function seedDatabase() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEED_KEY)) return;

  // --- Users ---
  const users = [
    {
      id: 'user_admin',
      name: 'José Silva',
      email: 'jose@lojinha.com',
      password: 'admin123',
      role: 'admin',
      phone: '(11) 99999-1234',
      avatar: 'JS',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user_c1',
      name: 'Maria Oliveira',
      email: 'maria@email.com',
      password: 'cliente123',
      role: 'customer',
      phone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      address: 'Rua das Flores, 123 - São Paulo/SP',
      avatar: 'MO',
      createdAt: '2024-02-15T00:00:00Z',
    },
    {
      id: 'user_c2',
      name: 'Carlos Santos',
      email: 'carlos@email.com',
      password: 'cliente123',
      role: 'customer',
      phone: '(11) 91234-5678',
      cpf: '987.654.321-00',
      address: 'Av. Brasil, 456 - São Paulo/SP',
      avatar: 'CS',
      createdAt: '2024-03-10T00:00:00Z',
    },
    {
      id: 'user_c3',
      name: 'Ana Pereira',
      email: 'ana@email.com',
      password: 'cliente123',
      role: 'customer',
      phone: '(21) 99876-5432',
      cpf: '456.789.123-00',
      address: 'Rua do Sol, 789 - Rio de Janeiro/RJ',
      avatar: 'AP',
      createdAt: '2024-04-05T00:00:00Z',
    },
    {
      id: 'user_c4',
      name: 'Roberto Lima',
      email: 'roberto@email.com',
      password: 'cliente123',
      role: 'customer',
      phone: '(31) 98765-1234',
      cpf: '321.654.987-00',
      address: 'Rua Minas, 321 - Belo Horizonte/MG',
      avatar: 'RL',
      createdAt: '2024-05-20T00:00:00Z',
    },
    {
      id: 'user_c5',
      name: 'Fernanda Costa',
      email: 'fernanda@email.com',
      password: 'cliente123',
      role: 'customer',
      phone: '(41) 99123-4567',
      cpf: '654.321.987-00',
      address: 'Av. Paraná, 654 - Curitiba/PR',
      avatar: 'FC',
      createdAt: '2024-06-12T00:00:00Z',
    },
  ];

  // --- Products ---
  const products = [
    { id: 'prod_1', code: 'TL-001', name: 'Tela LCD iPhone 12', category: 'Telas', quantity: 15, minStock: 5, costPrice: 120.00, salePrice: 250.00, supplier: 'TechParts Brasil', createdAt: '2024-01-15T00:00:00Z' },
    { id: 'prod_2', code: 'TL-002', name: 'Tela LCD Samsung S21', category: 'Telas', quantity: 8, minStock: 5, costPrice: 150.00, salePrice: 300.00, supplier: 'TechParts Brasil', createdAt: '2024-01-15T00:00:00Z' },
    { id: 'prod_3', code: 'BT-001', name: 'Bateria iPhone 11', category: 'Baterias', quantity: 25, minStock: 10, costPrice: 35.00, salePrice: 80.00, supplier: 'PowerCell', createdAt: '2024-01-20T00:00:00Z' },
    { id: 'prod_4', code: 'BT-002', name: 'Bateria Samsung A52', category: 'Baterias', quantity: 18, minStock: 10, costPrice: 30.00, salePrice: 70.00, supplier: 'PowerCell', createdAt: '2024-02-01T00:00:00Z' },
    { id: 'prod_5', code: 'CN-001', name: 'Conector de Carga USB-C', category: 'Conectores', quantity: 50, minStock: 20, costPrice: 8.00, salePrice: 25.00, supplier: 'MicroComp', createdAt: '2024-02-10T00:00:00Z' },
    { id: 'prod_6', code: 'CN-002', name: 'Conector Lightning iPhone', category: 'Conectores', quantity: 3, minStock: 15, costPrice: 12.00, salePrice: 30.00, supplier: 'MicroComp', createdAt: '2024-02-10T00:00:00Z' },
    { id: 'prod_7', code: 'CP-001', name: 'Capinha Silicone iPhone 13', category: 'Acessórios', quantity: 40, minStock: 15, costPrice: 5.00, salePrice: 25.00, supplier: 'AcessóriosMania', createdAt: '2024-03-01T00:00:00Z' },
    { id: 'prod_8', code: 'PL-001', name: 'Película de Vidro Universal', category: 'Acessórios', quantity: 100, minStock: 30, costPrice: 2.50, salePrice: 15.00, supplier: 'AcessóriosMania', createdAt: '2024-03-01T00:00:00Z' },
    { id: 'prod_9', code: 'FL-001', name: 'Flex Power iPhone X', category: 'Flexíveis', quantity: 12, minStock: 5, costPrice: 18.00, salePrice: 45.00, supplier: 'TechParts Brasil', createdAt: '2024-03-15T00:00:00Z' },
    { id: 'prod_10', code: 'CM-001', name: 'Câmera Traseira iPhone 12', category: 'Câmeras', quantity: 6, minStock: 3, costPrice: 90.00, salePrice: 180.00, supplier: 'TechParts Brasil', createdAt: '2024-04-01T00:00:00Z' },
    { id: 'prod_11', code: 'AT-001', name: 'Alto-falante Samsung S20', category: 'Áudio', quantity: 2, minStock: 5, costPrice: 15.00, salePrice: 40.00, supplier: 'MicroComp', createdAt: '2024-04-10T00:00:00Z' },
    { id: 'prod_12', code: 'FR-001', name: 'Ferramentas Kit Reparo', category: 'Ferramentas', quantity: 10, minStock: 3, costPrice: 25.00, salePrice: 60.00, supplier: 'ToolMaster', createdAt: '2024-04-15T00:00:00Z' },
  ];

  // --- Services ---
  const services = [
    {
      id: 'serv_1', customerId: 'user_c1', customerName: 'Maria Oliveira',
      description: 'Troca de tela LCD iPhone 12', device: 'iPhone 12',
      status: 'concluido', value: 350.00, cost: 120.00,
      products: [{ productId: 'prod_1', name: 'Tela LCD iPhone 12', quantity: 1, price: 250.00 }],
      notes: 'Tela com trincado na parte superior. Clone aprovado.',
      deadline: '2025-03-08', createdAt: '2025-03-05T10:00:00Z', updatedAt: '2025-03-08T14:00:00Z',
    },
    {
      id: 'serv_2', customerId: 'user_c2', customerName: 'Carlos Santos',
      description: 'Troca de bateria Samsung A52', device: 'Samsung A52',
      status: 'em_andamento', value: 120.00, cost: 30.00,
      products: [{ productId: 'prod_4', name: 'Bateria Samsung A52', quantity: 1, price: 70.00 }],
      notes: 'Bateria viciada, desliga com 30%.',
      deadline: '2025-03-12', createdAt: '2025-03-10T09:00:00Z', updatedAt: '2025-03-10T09:00:00Z',
    },
    {
      id: 'serv_3', customerId: 'user_c3', customerName: 'Ana Pereira',
      description: 'Reparo conector de carga', device: 'Motorola G52',
      status: 'pendente', value: 80.00, cost: 8.00,
      products: [{ productId: 'prod_5', name: 'Conector de Carga USB-C', quantity: 1, price: 25.00 }],
      notes: 'Não carrega. Verificar flex e conector.',
      deadline: '2025-03-15', createdAt: '2025-03-11T08:00:00Z', updatedAt: '2025-03-11T08:00:00Z',
    },
    {
      id: 'serv_4', customerId: 'user_c1', customerName: 'Maria Oliveira',
      description: 'Troca de película e capinha', device: 'iPhone 13',
      status: 'entregue', value: 50.00, cost: 7.50,
      products: [
        { productId: 'prod_8', name: 'Película de Vidro Universal', quantity: 1, price: 15.00 },
        { productId: 'prod_7', name: 'Capinha Silicone iPhone 13', quantity: 1, price: 25.00 },
      ],
      notes: 'Entrega rápida, cliente satisfeita.',
      deadline: '2025-03-03', createdAt: '2025-03-02T11:00:00Z', updatedAt: '2025-03-03T16:00:00Z',
    },
    {
      id: 'serv_5', customerId: 'user_c4', customerName: 'Roberto Lima',
      description: 'Troca de câmera traseira iPhone 12', device: 'iPhone 12',
      status: 'em_andamento', value: 280.00, cost: 90.00,
      products: [{ productId: 'prod_10', name: 'Câmera Traseira iPhone 12', quantity: 1, price: 180.00 }],
      notes: 'Câmera não foca. Substituição necessária.',
      deadline: '2025-03-13', createdAt: '2025-03-10T15:00:00Z', updatedAt: '2025-03-11T10:00:00Z',
    },
    {
      id: 'serv_6', customerId: 'user_c5', customerName: 'Fernanda Costa',
      description: 'Troca de tela Samsung S21', device: 'Samsung S21',
      status: 'pendente', value: 450.00, cost: 150.00,
      products: [{ productId: 'prod_2', name: 'Tela LCD Samsung S21', quantity: 1, price: 300.00 }],
      notes: 'Display inteiramente quebrado após queda.',
      deadline: '2025-03-18', createdAt: '2025-03-11T12:00:00Z', updatedAt: '2025-03-11T12:00:00Z',
    },
  ];

  // --- Payments ---
  const payments = [
    {
      id: 'pay_1', serviceId: 'serv_1', customerId: 'user_c1', customerName: 'Maria Oliveira',
      description: 'Pagamento - Troca de tela iPhone 12',
      totalValue: 350.00, paidValue: 350.00, remainingValue: 0,
      method: 'pix', status: 'pago', installments: 1,
      date: '2025-03-08T14:00:00Z', createdAt: '2025-03-08T14:00:00Z',
    },
    {
      id: 'pay_2', serviceId: 'serv_4', customerId: 'user_c1', customerName: 'Maria Oliveira',
      description: 'Pagamento - Película e capinha iPhone 13',
      totalValue: 50.00, paidValue: 50.00, remainingValue: 0,
      method: 'dinheiro', status: 'pago', installments: 1,
      date: '2025-03-03T16:00:00Z', createdAt: '2025-03-03T16:00:00Z',
    },
    {
      id: 'pay_3', serviceId: 'serv_2', customerId: 'user_c2', customerName: 'Carlos Santos',
      description: 'Pagamento - Troca de bateria Samsung A52',
      totalValue: 120.00, paidValue: 60.00, remainingValue: 60.00,
      method: 'cartao', status: 'parcial', installments: 2,
      date: '2025-03-10T09:30:00Z', createdAt: '2025-03-10T09:30:00Z',
    },
    {
      id: 'pay_4', serviceId: 'serv_5', customerId: 'user_c4', customerName: 'Roberto Lima',
      description: 'Pagamento - Troca de câmera iPhone 12',
      totalValue: 280.00, paidValue: 0, remainingValue: 280.00,
      method: '', status: 'pendente', installments: 1,
      date: '', createdAt: '2025-03-10T15:00:00Z',
    },
    {
      id: 'pay_5', serviceId: 'serv_6', customerId: 'user_c5', customerName: 'Fernanda Costa',
      description: 'Pagamento - Troca de tela Samsung S21',
      totalValue: 450.00, paidValue: 0, remainingValue: 450.00,
      method: '', status: 'pendente', installments: 1,
      date: '', createdAt: '2025-03-11T12:00:00Z',
    },
  ];

  // --- Financial Transactions ---
  const transactions = [
    { id: 'tx_1', type: 'entrada', category: 'Serviço', description: 'Troca de tela iPhone 12 - Maria', value: 350.00, date: '2025-03-08', createdAt: '2025-03-08T14:00:00Z' },
    { id: 'tx_2', type: 'entrada', category: 'Serviço', description: 'Película e capinha - Maria', value: 50.00, date: '2025-03-03', createdAt: '2025-03-03T16:00:00Z' },
    { id: 'tx_3', type: 'entrada', category: 'Serviço', description: 'Pagamento parcial bateria - Carlos', value: 60.00, date: '2025-03-10', createdAt: '2025-03-10T09:30:00Z' },
    { id: 'tx_4', type: 'saida', category: 'Fornecedor', description: 'Compra de telas LCD - TechParts', value: 1200.00, date: '2025-03-01', createdAt: '2025-03-01T10:00:00Z' },
    { id: 'tx_5', type: 'saida', category: 'Fornecedor', description: 'Compra de baterias - PowerCell', value: 480.00, date: '2025-03-02', createdAt: '2025-03-02T11:00:00Z' },
    { id: 'tx_6', type: 'saida', category: 'Aluguel', description: 'Aluguel do mês - Março', value: 1500.00, date: '2025-03-05', createdAt: '2025-03-05T08:00:00Z' },
    { id: 'tx_7', type: 'saida', category: 'Energia', description: 'Conta de luz - Março', value: 280.00, date: '2025-03-06', createdAt: '2025-03-06T09:00:00Z' },
    { id: 'tx_8', type: 'entrada', category: 'Venda', description: 'Venda de capinhas avulsas', value: 125.00, date: '2025-03-07', createdAt: '2025-03-07T14:00:00Z' },
    { id: 'tx_9', type: 'entrada', category: 'Venda', description: 'Venda de películas avulsas', value: 75.00, date: '2025-03-09', createdAt: '2025-03-09T11:00:00Z' },
    { id: 'tx_10', type: 'saida', category: 'Material', description: 'Cola UV e ferramentas', value: 85.00, date: '2025-03-04', createdAt: '2025-03-04T10:00:00Z' },
    { id: 'tx_11', type: 'entrada', category: 'Serviço', description: 'Formatação de notebook - Cliente avulso', value: 150.00, date: '2025-02-28', createdAt: '2025-02-28T16:00:00Z' },
    { id: 'tx_12', type: 'entrada', category: 'Venda', description: 'Carregador USB-C', value: 45.00, date: '2025-02-25', createdAt: '2025-02-25T13:00:00Z' },
    { id: 'tx_13', type: 'saida', category: 'Internet', description: 'Conta de internet - Março', value: 120.00, date: '2025-03-07', createdAt: '2025-03-07T08:00:00Z' },
  ];

  // --- Inventory Log ---
  const inventoryLog = [
    { id: 'inv_1', productId: 'prod_1', productName: 'Tela LCD iPhone 12', type: 'saida', quantity: 1, reason: 'Serviço #serv_1', date: '2025-03-05T10:00:00Z' },
    { id: 'inv_2', productId: 'prod_4', productName: 'Bateria Samsung A52', type: 'saida', quantity: 1, reason: 'Serviço #serv_2', date: '2025-03-10T09:00:00Z' },
    { id: 'inv_3', productId: 'prod_8', productName: 'Película de Vidro Universal', type: 'saida', quantity: 1, reason: 'Serviço #serv_4', date: '2025-03-02T11:00:00Z' },
    { id: 'inv_4', productId: 'prod_7', productName: 'Capinha Silicone iPhone 13', type: 'saida', quantity: 1, reason: 'Serviço #serv_4', date: '2025-03-02T11:00:00Z' },
    { id: 'inv_5', productId: 'prod_1', productName: 'Tela LCD iPhone 12', type: 'entrada', quantity: 10, reason: 'Compra fornecedor TechParts', date: '2025-03-01T10:00:00Z' },
    { id: 'inv_6', productId: 'prod_3', productName: 'Bateria iPhone 11', type: 'entrada', quantity: 20, reason: 'Compra fornecedor PowerCell', date: '2025-03-02T11:00:00Z' },
  ];

  // Save all data
  localStorage.setItem(DB_PREFIX + 'users', JSON.stringify(users));
  localStorage.setItem(DB_PREFIX + 'products', JSON.stringify(products));
  localStorage.setItem(DB_PREFIX + 'services', JSON.stringify(services));
  localStorage.setItem(DB_PREFIX + 'payments', JSON.stringify(payments));
  localStorage.setItem(DB_PREFIX + 'transactions', JSON.stringify(transactions));
  localStorage.setItem(DB_PREFIX + 'inventoryLog', JSON.stringify(inventoryLog));
  localStorage.setItem(SEED_KEY, 'true');
}

// ============================================
// Helpers
// ============================================
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

export function getStatusLabel(status) {
  const labels = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    concluido: 'Concluído',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
    pago: 'Pago',
    parcial: 'Parcial',
    atrasado: 'Atrasado',
  };
  return labels[status] || status;
}

export function getStatusVariant(status) {
  const variants = {
    pendente: 'warning',
    em_andamento: 'info',
    concluido: 'success',
    entregue: 'primary',
    cancelado: 'danger',
    pago: 'success',
    parcial: 'warning',
    atrasado: 'danger',
  };
  return variants[status] || 'neutral';
}

export function getPaymentMethodLabel(method) {
  const labels = {
    pix: 'PIX',
    cartao: 'Cartão',
    dinheiro: 'Dinheiro',
    boleto: 'Boleto',
    transferencia: 'Transferência',
  };
  return labels[method] || method || '—';
}
