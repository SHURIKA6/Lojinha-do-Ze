/**
 * API: reports
 */

import { request, getCsrfToken } from './client';

export interface DashboardData {
  monthRevenue: number;
  monthExpenses: number;
  profit: number;
  activeOrders: number;
  totalSales: number;
  uniqueVisitors: number;
  conversionRate: number;
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
  monthlyRevenue: Array<{
    month: string;
    total: number;
  }>;
}

export async function getDashboard(
  range?: string, 
  signal?: AbortSignal,
  startDate?: Date,
  endDate?: Date
): Promise<DashboardData | null> {
  const params = new URLSearchParams();
  
  // Adiciona range se fornecido (compatibilidade retroativa)
  if (range) {
    params.append('range', range);
  }
  
  // Adiciona datas explícitas se fornecidas (correção do filtro)
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  
  const queryString = params.toString();
  const url = queryString ? `/dashboard?${queryString}` : '/dashboard';
  
  const res = await request<Record<string, unknown>>(url, { signal });
  
  const data = res?.data && typeof res.data === "object" ? res.data as Record<string, unknown> : res;
  
  if (!data || typeof data !== "object") {
    return null;
  }

  return {
    monthRevenue: Number(data.monthRevenue || 0),
    monthExpenses: Number(data.monthExpenses || 0),
    profit: Number(data.profit || 0),
    activeOrders: Number(data.activeOrders || 0),
    totalSales: Number(data.totalSales || 0),
    uniqueVisitors: Number(data.uniqueVisitors || 0),
    conversionRate: Number(data.conversionRate || 0),
    lowStock: Array.isArray(data.lowStock) ? data.lowStock : [],
    recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
    chartData: Array.isArray(data.chartData) ? data.chartData : [],
    categoryChart: Array.isArray(data.categoryChart) ? data.categoryChart : [],
    monthlyRevenue: Array.isArray(data.monthlyRevenue) ? data.monthlyRevenue : []
  };
}

export async function getReport<T>(type: string): Promise<T | null> {
  return request<T>(`/reports/${type}`);
}

export async function exportReportCsv(reportType: string, signal?: AbortSignal): Promise<void> {
  // Usa o proxy do Next.js (/api/[...path]) para encaminhar a requisição ao backend
  const response = await fetch('/api/reports/export', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCsrfToken(),
    },
    body: JSON.stringify({ reportType, format: 'csv' }),
    credentials: "include",
    signal
  });

  if (!response.ok) {
    // Tenta ler mensagem de erro como JSON ou texto
    let errorMessage = "Falha ao exportar relatório";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Mantém mensagem padrão
      }
    }
    throw new Error(errorMessage);
  }

  // Verifica se a resposta é um blob (arquivo) ou JSON
  const contentType = response.headers.get('content-type') || '';
  const contentDisposition = response.headers.get('content-disposition') || '';
  
  if (contentType.includes('application/json')) {
    // Se o backend retornou JSON, pode ser um erro ou mensagem de sucesso
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    throw new Error("Resposta inesperada do servidor");
  }

  // Processa o download do arquivo
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  // Extrai o nome do arquivo do header Content-Disposition se disponível
  let filename = `relatorio_${reportType}.csv`;
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1].replace(/['"]/g, '');
  }
  
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
