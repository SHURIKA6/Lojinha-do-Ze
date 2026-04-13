import { request } from './client';

export interface DashboardData {
  monthRevenue: number;
  monthExpenses: number;
  profit: number;
  activeOrders: number;
  totalSales: number;
  lowStock: Array<{
    id: string | number;
    name: string;
    quantity: number;
    min_stock: number;
  }>;
  recentOrders: Array<{
    id: string | number;
    customer_name: string;
    delivery_type: string;
    status: string;
    total: number;
  }>;
  chartData: Array<{
    day: string;
    receita: number;
    despesa: number;
  }>;
  categoryChart: Array<{
    name: string;
    value: number;
  }>;
}

export async function getDashboard(): Promise<DashboardData | null> {
  const res = await request<any>('/panel-data');
  
  // O backend retorna os dados diretamente (c.json({ monthRevenue, ... }))
  // Ou pode retornar no formato ApiResponse { success, data }
  const data = res?.data || res;
  
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Sanitização básica para garantir que campos numéricos existam
  return {
    monthRevenue: Number(data.monthRevenue || 0),
    monthExpenses: Number(data.monthExpenses || 0),
    profit: Number(data.profit || 0),
    activeOrders: Number(data.activeOrders || 0),
    totalSales: Number(data.totalSales || 0),
    lowStock: Array.isArray(data.lowStock) ? data.lowStock : [],
    recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
    chartData: Array.isArray(data.chartData) ? data.chartData : [],
    categoryChart: Array.isArray(data.categoryChart) ? data.categoryChart : []
  };
}

export async function getReport<T = any>(type: string): Promise<T | null> {
  return request<T>(`/reports/${type}`);
}

export async function exportReportCsv(reportType: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('@LojinhaDoZe:token') : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  
  const response = await fetch(`${baseUrl}/reports/export/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ reportType })
  });

  if (!response.ok) {
    throw new Error('Falha ao exportar relatório');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_${reportType}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
