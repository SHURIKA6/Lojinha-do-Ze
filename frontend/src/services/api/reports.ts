import { API_BASE, ApiError, getCsrfToken, request } from './client';

export function getDashboard() {
  return request('/dashboard');
}

export function getReport(type: string) {
  return request(`/reports/${type}`);
}

export async function exportReportCsv(reportType: string) {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const csrfToken = getCsrfToken();

  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(`${API_BASE}/reports/export/csv`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reportType }),
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    let payload: any = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      payload = text ? { error: text } : null;
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    throw new ApiError(
      payload?.error || 'Falha ao exportar relatório',
      response.status,
      payload
    );
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
