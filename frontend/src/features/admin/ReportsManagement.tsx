'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiPieChart, 
  FiBarChart2, 
  FiDownload, 
  FiCalendar, 
  FiTrendingUp, 
  FiActivity,
  FiTarget,
  FiFileText,
  FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getDashboard, 
  exportReportCsv, 
  formatCurrency 
} from '@/lib/api';
import '@/app/admin/dashboard.css';

export default function ReportsManagement() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
      addToast('Erro ao atualizar indicadores de performance.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadMetrics();
    }
  }, [isAdmin]);

  const handleExport = async (type: string) => {
    try {
      setExporting(type);
      await exportReportCsv(type);
      addToast(`Relatório de ${type} exportado com sucesso.`, 'success');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      addToast('Erro ao processar exportação.', 'error');
    } finally {
      setExporting(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Gerando relatórios consolidados...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiPieChart />
            Business Intelligence
          </span>
          <h1>Relatórios e Performance</h1>
          <p className="page-header__subtitle">
            Análise de dados operacionais e exportação de relatórios estratégicos.
          </p>
        </div>
        <div className="page-header__actions">
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={loadMetrics}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
            Atualizar Dados
          </button>
        </div>
      </div>

      <div className="grid grid--cols-4" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Faturamento Mensal</span>
              <span className="stat-card__value">{formatCurrency(metrics?.monthRevenue || 0)}</span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)' }}>
              <FiTrendingUp />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Total de Vendas</span>
              <span className="stat-card__value">{metrics?.totalSales || 0}</span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--success-100)', color: 'var(--success-600)' }}>
              <FiTarget />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Ticket Médio</span>
              <span className="stat-card__value">
                {formatCurrency((metrics?.monthRevenue || 0) / (metrics?.totalSales || 1))}
              </span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--warning-100)', color: 'var(--warning-600)' }}>
              <FiActivity />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Pedidos Ativos</span>
              <span className="stat-card__value">{metrics?.activeOrders || 0}</span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--info-100)', color: 'var(--info-600)' }}>
              <FiCalendar />
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <FiBarChart2 style={{ fontSize: '3rem', color: 'var(--gray-300)', marginBottom: 'var(--space-4)' }} />
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Visualização de Dados em Alta Resolução</h3>
          <p style={{ maxWidth: '500px', margin: '0 auto var(--space-6) auto', color: 'var(--gray-600)' }}>
            O sistema está processando grandes volumes de dados. Para análises detalhadas e gráficos interativos, exporte os relatórios abaixo ou consulte o Dashboard Avançado.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button 
              className="btn btn--secondary" 
              style={{ minWidth: '200px' }}
              onClick={() => handleExport('sales')}
              disabled={!!exporting}
            >
              <FiDownload /> {exporting === 'sales' ? 'Exportando...' : 'Vendas (Mensal)'}
            </button>
            <button 
              className="btn btn--secondary" 
              style={{ minWidth: '200px' }}
              onClick={() => handleExport('inventory')}
              disabled={!!exporting}
            >
              <FiDownload /> {exporting === 'inventory' ? 'Exportando...' : 'Estoque e SKU'}
            </button>
            <button 
              className="btn btn--secondary" 
              style={{ minWidth: '200px' }}
              onClick={() => handleExport('customers')}
              disabled={!!exporting}
            >
              <FiDownload /> {exporting === 'customers' ? 'Exportando...' : 'Base de Clientes'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiFileText className="text-primary" />
          <h4 style={{ margin: 0 }}>Histórico de Exportações</h4>
        </div>
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--gray-400)', fontSize: 'var(--font-sm)' }}>
          Nenhuma exportação recente registrada para este administrador.
        </div>
      </div>
    </div>
  );
}
