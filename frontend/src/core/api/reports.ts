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
  return request<DashboardData>('/dashboard');
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
