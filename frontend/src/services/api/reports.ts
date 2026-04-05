import { request } from './client';

export function getDashboard() {
  return request('/dashboard');
}

export function getReport(type: string) {
  return request(`/reports/${type}`);
}

export async function exportReportCsv(reportType: string) {
  // Using native fetch since it returns a file blob
  const token = localStorage.getItem('@LojinhaDoZe:token');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reports/export/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
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
