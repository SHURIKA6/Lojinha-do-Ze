'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/services/auth/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { AuthContextType } from '@/types';
import { 
  getDashboard, 
  formatCurrency, 
  getStatusLabel, 
  getStatusVariant,
  exportReportCsv
} from '@/lib/api';
import { 
  FiShoppingBag, 
  FiPackage, 
  FiTrendingUp, 
  FiDollarSign, 
  FiClock, 
  FiAlertCircle, 
  FiChevronRight,
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

interface ChartDataItem {
  day: string;
  receita: number;
  despesa: number;
  lucro?: number;
  margem?: number;
}

interface CategoryChartItem {
  name: string;
  value: number;
}

interface DashboardData {
  monthRevenue: number;
  totalSales: number;
  activeOrders: number;
  profit: number;
  chartData: ChartDataItem[];
  categoryChart: CategoryChartItem[];
}

export default function AdvancedDashboard() {
  const { user, isAdmin }: AuthContextType = useAuth();
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
        const result = await getDashboard() as DashboardData;
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
  }, [isAdmin, toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await getDashboard() as DashboardData;
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

    return {
      totalRevenue,
      totalSales,
      activeOrders,
      profit,
      profitMargin,
      avgOrderValue,
      conversionRate: 85.5, // Simulado
      customerSatisfaction: 92.3, // Simulado
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
    <div className="fade-in admin-dashboard">
      {/* Header com controles */}
      <header className="admin-dashboard__header">
        <div className="admin-dashboard__header-info">
          <h1 className="admin-dashboard__title" style={{ color: 'white' }}>Dashboard Avançado</h1>
          <p className="admin-dashboard__subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>
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
            className="btn-admin"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </header>

      {/* Métricas principais */}
      <div className="admin-dashboard__metrics">
        <div className="metric-card">
          <div className="metric-card__icon">
            <FiDollarSign />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Faturamento Mensal</span>
            <span className="metric-card__value">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card__icon">
            <FiShoppingBag />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Vendas Concluídas</span>
            <span className="metric-card__value">{metrics?.totalSales || 0}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card__icon">
            <FiPackage />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Pedidos Ativos</span>
            <span className="metric-card__value">{metrics?.activeOrders || 0}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card__icon">
            <FiTrendingUp />
          </div>
          <div className="metric-card__content">
            <span className="metric-card__label">Lucro Previsto</span>
            <span className="metric-card__value">
              {formatCurrency(metrics?.profit || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos avançados */}
      <div className="admin-dashboard__charts">
        <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiBarChart2 className="dashboard-card__title-icon" style={{ color: 'var(--admin-accent)' }} />
              Fluxo Financeiro Diário
            </h3>
          </div>
          <div className="dashboard-card__body--padded" style={{ height: '400px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#4a5568', fontSize: 10 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#4a5568', fontSize: 10 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      backgroundColor: 'white'
                    }}
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value)),
                      name === 'receita' ? 'Receita' : 
                      name === 'despesa' ? 'Despesa' : 'Lucro'
                    ]}
                  />
                  <Bar dataKey="receita" fill="#667eea" radius={[4, 4, 0, 0]} barSize={20} name="receita" />
                  <Bar dataKey="despesa" fill="#e53e3e" radius={[4, 4, 0, 0]} barSize={20} name="despesa" />
                  <Line type="monotone" dataKey="lucro" stroke="#764ba2" strokeWidth={3} dot={false} name="lucro" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                <FiBarChart2 size={48} />
                <p>Sem dados suficientes para gerar o gráfico.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}