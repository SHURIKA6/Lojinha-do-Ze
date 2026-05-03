/**
 * Feature: AdvancedDashboard
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/core/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getDashboard, 
  formatCurrency, 
  exportReportCsv,
  DashboardData
} from '@/core/api';
import { 
  FiShoppingBag, 
  FiPackage, 
  FiTrendingUp, 
  FiDollarSign, 
  FiAlertCircle, 
  FiBarChart2,
  FiPieChart,
  FiDownload,
  FiFilter,
  FiCalendar,
  FiRefreshCw,
  FiUsers,
  FiTarget,
  FiPercent,
  FiArrowUp,
  FiArrowDown,
  FiActivity
} from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { CHART_COLORS } from '@/styles/theme';
import '@/app/admin/dashboard.css';

// IMPLEMENTAÇÃO DE CODE SPLITTING GRANULAR (Fase 4)
// Lazy load dos gráficos pesados (Recharts) apenas no cliente e quando necessário
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false, loading: () => <div className="admin-dashboard-loading__chart" /> });
const ComposedChart = dynamic(() => import('recharts').then(mod => mod.ComposedChart), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });


export default function AdvancedDashboard() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Mapeamento de texto para o range selecionado
  const rangeText = useMemo(() => {
    switch (dateRange) {
      case '7d': return 'dos últimos 7 dias';
      case '30d': return 'dos últimos 30 dias';
      case '90d': return 'dos últimos 90 dias';
      case '1y': return 'do último ano';
      case 'month': return 'do mês atual';
      default: return 'do período selecionado';
    }
  }, [dateRange]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const result = await getDashboard(dateRange);
        setData(result);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Não foi possível carregar as métricas do dashboard.');
        toast.error('Erro ao carregar os dados do painel.');
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, dateRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await getDashboard(dateRange);
      setData(result);
      toast.success('Dados atualizados com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar dados.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: string) => {
    if (format === 'CSV') {
      try {
        toast.info(`Exportação em ${format} iniciada...`);
        await exportReportCsv('vendas'); // Exportando ordens por padrão aqui, expandir se necessário
        toast.success('Exportação concluída com sucesso!');
      } catch (err) {
        toast.error('Falha ao exportar relatório. Tente novamente.');
      }
    } else {
      toast.info(`A exportação em ${format} ainda não foi implementada para este plano.`);
    }
  };

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (!data) return null;

    const totalRevenue = data.monthRevenue || 0;
    const totalSales = data.totalSales || 0;
    const activeOrders = data.activeOrders || 0;
    const profit = data.profit || 0;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const conversionRate = data.conversionRate || 0;
    const uniqueVisitors = data.uniqueVisitors || 0;

    return {
      totalRevenue,
      totalSales,
      activeOrders,
      profit,
      profitMargin,
      avgOrderValue,
      conversionRate,
      uniqueVisitors,
      customerSatisfaction: 94.8, // Ainda simulado até termos sistema de reviews
    };
  }, [data]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    if (!data?.chartData) return [];

    return data.chartData.map(item => ({
      ...item,
      lucro: item.receita - item.despesa,
      margem: item.receita > 0 ? ((item.receita - item.despesa) / item.receita) * 100 : 0,
    }));
  }, [data?.chartData]);

  if (loading && !data) {
    return (
      <div className="dashboard-container">
        <div className="admin-dashboard-loading">
          <div className="admin-dashboard-loading__title"></div>
          <div className="admin-dashboard-loading__metrics">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="admin-dashboard-loading__metric loading-shimmer"></div>
            ))}
          </div>
          <div className="admin-dashboard-loading__charts">
            <div className="admin-dashboard-loading__chart loading-shimmer"></div>
            <div className="admin-dashboard-loading__chart loading-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <div className="admin-error__icon">
          <FiAlertCircle />
        </div>
        <h2 className="admin-error__title">Ops! Algo deu errado</h2>
        <p className="admin-error__message">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn btn--primary"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header com controles */}
      <header className="dashboard-header" role="banner">
        <div className="header-content">
          <h1>Dashboard Avançado</h1>
          <p>
            Olá, {user?.name || 'Administrador'}. Aqui está o panorama detalhado {rangeText}.
          </p>
        </div>
        <div className="admin-dashboard__header-actions">
          <div className="controls-group" role="group" aria-label="Filtros de período">
            <button 
              onClick={() => setDateRange('7d')} 
              className={`control-btn ${dateRange === '7d' ? 'active' : ''}`}
              aria-pressed={dateRange === '7d'}
            >
              7D
            </button>
            <button 
              onClick={() => setDateRange('30d')} 
              className={`control-btn ${dateRange === '30d' ? 'active' : ''}`}
              aria-pressed={dateRange === '30d'}
            >
              30D
            </button>
            <button 
              onClick={() => setDateRange('90d')} 
              className={`control-btn ${dateRange === '90d' ? 'active' : ''}`}
              aria-pressed={dateRange === '90d'}
            >
              90D
            </button>
            <button 
              onClick={() => setDateRange('1y')} 
              className={`control-btn ${dateRange === '1y' ? 'active' : ''}`}
              aria-pressed={dateRange === '1y'}
            >
              1Y
            </button>
          </div>
          
          <button 
            className="admin-dashboard__refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Atualizar dados do dashboard"
          >
            <FiRefreshCw className={(refreshing || loading) ? 'animate-spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          
          <div className="admin-dashboard__export-dropdown">
            <button className="admin-dashboard__export-btn" aria-haspopup="true" aria-expanded="false">
              <FiDownload /> Exportar
            </button>
            <div className="admin-dashboard__export-options" role="menu">
              <button role="menuitem" onClick={() => handleExport('PDF')}>📄 PDF</button>
              <button role="menuitem" onClick={() => handleExport('Excel')}>📊 Excel</button>
              <button role="menuitem" onClick={() => handleExport('CSV')}>📈 CSV</button>
            </div>
          </div>
        </div>
      </header>

      {/* Métricas principais */}
      <div className="metrics-grid" role="region" aria-label="Métricas de desempenho">
        <div className="glass-card metric-card" aria-label="Faturamento Total">
          <div className="metric-label">
            <FiDollarSign style={{ color: 'var(--success-500)' }} />
            <span>Faturamento</span>
          </div>
          <div className="metric-value">
            {formatCurrency(metrics?.totalRevenue || 0)}
          </div>
          <div className="metric-trend trend-up">
            <FiArrowUp /> +12.5%
          </div>
        </div>

        <div className="glass-card metric-card" aria-label="Vendas Concluídas">
          <div className="metric-label">
            <FiShoppingBag style={{ color: 'var(--info-500)' }} />
            <span>Vendas</span>
          </div>
          <div className="metric-value">{metrics?.totalSales || 0}</div>
          <div className="metric-trend trend-up">
            <FiArrowUp /> +8.3%
          </div>
        </div>

        <div className="glass-card metric-card" aria-label="Pedidos Ativos">
          <div className="metric-label">
            <FiPackage style={{ color: 'var(--warning-500)' }} />
            <span>Pedidos Ativos</span>
          </div>
          <div className="metric-value">{metrics?.activeOrders || 0}</div>
          <div className="metric-trend trend-down">
            <FiArrowDown /> -2.1%
          </div>
        </div>

        <div className="glass-card metric-card" aria-label="Lucro Previsto">
          <div className="metric-label">
            <FiTrendingUp style={{ color: 'var(--primary-500)' }} />
            <span>Lucro Líquido</span>
          </div>
          <div className="metric-value">
            {formatCurrency(metrics?.profit || 0)}
          </div>
          <div className="metric-trend trend-up">
            <FiArrowUp /> +15.7%
          </div>
        </div>

        <div className="glass-card metric-card" aria-label="Margem de Lucro">
          <div className="metric-label">
            <FiPercent style={{ color: 'var(--danger-500)' }} />
            <span>Margem</span>
          </div>
          <div className="metric-value">
            {metrics?.profitMargin?.toFixed(1) || 0}%
          </div>
          <div className="metric-trend trend-up">
            <FiArrowUp /> +3.2%
          </div>
        </div>

        <div className="glass-card metric-card" aria-label="Visitantes Únicos">
          <div className="metric-label">
            <FiUsers style={{ color: 'var(--secondary-500)' }} />
            <span>Visitantes</span>
          </div>
          <div className="metric-value">
            {metrics?.uniqueVisitors || 0}
          </div>
          <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>
            <FiActivity /> Real-time
          </div>
        </div>
      </div>

      {/* Gráficos avançados */}
      <div className="charts-grid">
        <div className="glass-card chart-container chart-main">
          <div className="chart-header">
            <h3 className="chart-title">
              <FiBarChart2 style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />
              Fluxo Financeiro Diário
            </h3>
          </div>
          <div style={{ height: '350px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--gray-400)', fontSize: 10 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--gray-400)', fontSize: 10 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: 'var(--shadow-md)',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                    formatter={(value: any, name?: any) => [
                      formatCurrency(value),
                      name === 'receita' ? 'Receita' : 
                      name === 'despesa' ? 'Despesa' : 'Lucro'
                    ]}
                  />
                  <Bar dataKey="receita" fill="var(--success-500)" radius={[4, 4, 0, 0]} barSize={20} name="receita" />
                  <Bar dataKey="despesa" fill="var(--danger-500)" radius={[4, 4, 0, 0]} barSize={20} name="despesa" />
                  <Line type="monotone" dataKey="lucro" stroke="var(--primary-500)" strokeWidth={3} dot={false} name="lucro" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-empty dashboard-empty--centered">
                <FiBarChart2 className="dashboard-empty__icon" />
                <p>Sem dados suficientes para gerar o gráfico.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card chart-container chart-secondary">
          <div className="chart-header">
            <h3 className="chart-title">
              <FiPieChart style={{ color: 'var(--accent-secondary)', marginRight: '0.5rem' }} />
              Categorias
            </h3>
          </div>
          <div style={{ height: '300px' }}>
            {data?.categoryChart?.length && data.categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryChart}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                  {(Array.isArray(data.categoryChart) ? data.categoryChart : []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Produtos']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-empty dashboard-empty--centered">
                <FiPieChart className="dashboard-empty__icon" />
                <p>Sem categorias cadastradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de margem de lucro */}
      <div className="charts-grid" style={{ marginTop: '1.5rem' }}>
        <div className="glass-card chart-container chart-main">
          <div className="chart-header">
            <h3 className="chart-title">
              <FiActivity style={{ color: 'var(--success-500)', marginRight: '0.5rem' }} />
              Margem de Lucro Diária
            </h3>
          </div>
          <div style={{ height: '300px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--gray-400)', fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--gray-400)', fontSize: 10 }} 
                    unit="%" 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: 'var(--shadow-md)',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Margem']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="margem" 
                    stroke="var(--success-500)" 
                    fill="var(--success-500)" 
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-empty dashboard-empty--centered">
                <FiActivity className="dashboard-empty__icon" />
                <p>Sem dados para exibir.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card chart-container chart-secondary">
          <div className="chart-header">
            <h3 className="chart-title">
              <FiTarget style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />
              Performance
            </h3>
          </div>
          <div className="performance-indicators">
            <div className="performance-indicators">
              <div className="performance-indicator">
                <div className="performance-indicator__header">
                  <span className="performance-indicator__label">Taxa de Conversão</span>
                  <span className="performance-indicator__value">{metrics?.conversionRate}%</span>
                </div>
                <div className="performance-indicator__bar">
                  <div 
                    className="performance-indicator__fill" 
                    style={{ width: `${metrics?.conversionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="performance-indicator">
                <div className="performance-indicator__header">
                  <span className="performance-indicator__label">Satisfação do Cliente</span>
                  <span className="performance-indicator__value">{metrics?.customerSatisfaction}%</span>
                </div>
                <div className="performance-indicator__bar">
                  <div 
                    className="performance-indicator__fill performance-indicator__fill--success" 
                    style={{ width: `${metrics?.customerSatisfaction}%` }}
                  ></div>
                </div>
              </div>

              <div className="performance-indicator">
                <div className="performance-indicator__header">
                  <span className="performance-indicator__label">Margem de Lucro</span>
                  <span className="performance-indicator__value">{metrics?.profitMargin?.toFixed(1)}%</span>
                </div>
                <div className="performance-indicator__bar">
                  <div 
                    className="performance-indicator__fill performance-indicator__fill--primary" 
                    style={{ width: `${Math.min(metrics?.profitMargin || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de comparativo mensal */}
      <div className="charts-grid" style={{ marginTop: '1.5rem' }}>
        <div className="glass-card chart-container chart-main">
          <div className="chart-header">
            <h3 className="chart-title">
              <FiBarChart2 style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }} />
              Faturamento Mensal (6 Meses)
            </h3>
          </div>
          <div style={{ height: '300px' }}>
            {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--gray-400)', fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--gray-400)', fontSize: 10 }} 
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: 'var(--shadow-md)',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Faturamento']}
                  />
                  <Bar dataKey="total" fill="var(--primary-500)" radius={[4, 4, 0, 0]} barSize={40} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-empty dashboard-empty--centered">
                <FiBarChart2 className="dashboard-empty__icon" />
                <p>Sem histórico suficiente para o comparativo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
