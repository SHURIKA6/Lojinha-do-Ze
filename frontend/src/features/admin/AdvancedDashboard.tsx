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

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const result = await getDashboard();
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
  }, [isAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await getDashboard();
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

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-dashboard-loading__title"></div>
        <div className="admin-dashboard-loading__metrics">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="admin-dashboard-loading__metric"></div>
          ))}
        </div>
        <div className="admin-dashboard-loading__charts">
          <div className="admin-dashboard-loading__chart"></div>
          <div className="admin-dashboard-loading__chart"></div>
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
    <div className="admin-dashboard">
      {/* Header com controles */}
      <header className="admin-dashboard__header">
        <div className="admin-dashboard__header-info">
          <h1 className="admin-dashboard__title">Dashboard Avançado</h1>
          <p className="admin-dashboard__subtitle">
            Olá, {user?.name || 'Administrador'}. Aqui está o panorama detalhado do mês atual.
          </p>
        </div>
        <div className="admin-dashboard__header-actions">
          <div className="admin-dashboard__date-filter">
            <FiCalendar className="admin-dashboard__date-icon" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="admin-dashboard__date-select"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1y">Último ano</option>
            </select>
          </div>
          
          <button 
            className="admin-dashboard__refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          
          <div className="admin-dashboard__export-dropdown">
            <button className="admin-dashboard__export-btn">
              <FiDownload /> Exportar
            </button>
            <div className="admin-dashboard__export-options">
              <button onClick={() => handleExport('PDF')}>📄 PDF</button>
              <button onClick={() => handleExport('Excel')}>📊 Excel</button>
              <button onClick={() => handleExport('CSV')}>📈 CSV</button>
            </div>
          </div>
        </div>
      </header>

      {/* Métricas principais */}
      <div className="admin-dashboard__metrics">
        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiDollarSign />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Faturamento Mensal</span>
            <span className="metric-card__value">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </span>
            <span className="metric-card__change metric-card__change--positive">
              <FiArrowUp /> +12.5%
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiShoppingBag />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Vendas Concluídas</span>
            <span className="metric-card__value">{metrics?.totalSales || 0}</span>
            <span className="metric-card__change metric-card__change--positive">
              <FiArrowUp /> +8.3%
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--warning-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiPackage />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Pedidos Ativos</span>
            <span className="metric-card__value">{metrics?.activeOrders || 0}</span>
            <span className="metric-card__change metric-card__change--negative">
              <FiArrowDown /> -2.1%
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--primary-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiTrendingUp />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Lucro Previsto</span>
            <span className="metric-card__value">
              {formatCurrency(metrics?.profit || 0)}
            </span>
            <span className="metric-card__change metric-card__change--positive">
              <FiArrowUp /> +15.7%
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--danger-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiPercent />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Margem de Lucro</span>
            <span className="metric-card__value">
              {metrics?.profitMargin?.toFixed(1) || 0}%
            </span>
            <span className="metric-card__change metric-card__change--positive">
              <FiArrowUp /> +3.2%
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiTarget />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Ticket Médio</span>
            <span className="metric-card__value">
              {formatCurrency(metrics?.avgOrderValue || 0)}
            </span>
            <span className="metric-card__change metric-card__change--positive">
              <FiArrowUp /> +5.8%
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--secondary-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiUsers />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Visitantes Únicos</span>
            <span className="metric-card__value">
              {metrics?.uniqueVisitors || 0}
            </span>
            <span className="metric-card__change metric-card__change--positive">
              <FiActivity /> Tempo real
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos avançados */}
      <div className="admin-dashboard__charts">
        <div className="dashboard-card admin-dashboard__chart-main">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiBarChart2 className="dashboard-card__title-icon" style={{ color: 'var(--info-500)' }} />
              Fluxo Financeiro Diário
            </h3>
            <div className="dashboard-card__actions">
              <button className="dashboard-card__action-btn">
                <FiFilter /> Filtrar
              </button>
            </div>
          </div>
          <div className="dashboard-card__body--padded" style={{ height: '400px' }}>
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

        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiPieChart className="dashboard-card__title-icon" style={{ color: 'var(--primary-500)' }} />
              Categorias
            </h3>
          </div>
          <div className="dashboard-card__body--padded" style={{ height: '300px' }}>
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
      <div className="admin-dashboard__charts">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiActivity className="dashboard-card__title-icon" style={{ color: 'var(--success-500)' }} />
              Margem de Lucro Diária
            </h3>
          </div>
          <div className="dashboard-card__body--padded" style={{ height: '300px' }}>
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

        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiUsers className="dashboard-card__title-icon" style={{ color: 'var(--info-500)' }} />
              Indicadores de Performance
            </h3>
          </div>
          <div className="dashboard-card__body--padded">
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
      <div className="admin-dashboard__charts">
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiBarChart2 className="dashboard-card__title-icon" style={{ color: 'var(--primary-500)' }} />
              Faturamento Mensal (6 Meses)
            </h3>
          </div>
          <div className="dashboard-card__body--padded" style={{ height: '300px' }}>
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
