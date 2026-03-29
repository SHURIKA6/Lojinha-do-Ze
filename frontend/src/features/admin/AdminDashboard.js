'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getDashboard, 
  formatCurrency, 
  getStatusLabel, 
  getStatusVariant 
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
  FiPieChart
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '@/styles/theme';
import '@/app/admin/dashboard.css';
import AdminAssistant from './AdminAssistant';

/**
 * AdminDashboard - Componente principal do painel administrativo
 * Responsável por exibir métricas, pedidos recentes e alertas de estoque.
 */
export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const result = await getDashboard();
        setData(result);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Não foi possível carregar as métricas do dashboard.');
        addToast('Erro ao carregar os dados do painel.', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, addToast]);

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-dashboard-loading__title"></div>
        <div className="admin-dashboard-loading__metrics">
          {[1, 2, 3, 4].map((i) => (
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

  const metrics = [
    {
      label: 'Faturamento Mensal',
      value: formatCurrency(data?.monthRevenue || 0),
      color: 'var(--success-500)',
      icon: <FiDollarSign />
    },
    {
      label: 'Vendas Concluídas',
      value: data?.totalSales || 0,
      color: 'var(--info-500)',
      icon: <FiShoppingBag />
    },
    {
      label: 'Pedidos Ativos',
      value: data?.activeOrders || 0,
      color: 'var(--warning-500)',
      icon: <FiPackage />
    },
    {
      label: 'Lucro Previsto',
      value: formatCurrency(data?.profit || 0),
      color: 'var(--primary-500)',
      icon: <FiTrendingUp />
    }
  ];

  return (
    <div className="admin-dashboard">
      {/* Welcome Header */}
      <header className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Painel Operacional</h1>
        <p className="admin-dashboard__subtitle">Olá, {user?.name || 'Administrador'}. Aqui está o panorama do mês atual.</p>
      </header>

      {/* Metrics Cards */}
      <div className="admin-dashboard__metrics">
        {metrics.map((stat, idx) => (
          <div key={idx} className="metric-card" style={{ '--metric-color': stat.color }}>
            <div className="metric-card__icon">
              {stat.icon}
            </div>
            <div className="metric-card__content">
              <span className="metric-card__label">{stat.label}</span>
              <span className="metric-card__value">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="admin-dashboard__charts">
        <div className="dashboard-card admin-dashboard__chart-main">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiBarChart2 className="dashboard-card__title-icon" style={{ color: 'var(--info-500)' }} />
              Fluxo Financeiro Diário
            </h3>
          </div>
          <div className="dashboard-card__body--padded" style={{ height: '300px' }}>
            {data?.chartData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--gray-400)', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--gray-400)', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="receita" fill="var(--success-500)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="despesa" fill="var(--danger-500)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
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
            {data?.categoryChart?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryChart}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.categoryChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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

      {/* Lists Section */}
      <div className="admin-dashboard__lists">
        
        {/* Recent Orders */}
        <section className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiClock className="dashboard-card__title-icon" style={{ color: 'var(--warning-500)' }} />
              Pedidos Recentes
            </h3>
            <button 
              onClick={() => router.push('/admin/pedidos')}
              className="view-all-link"
            >
              Ver tudo <FiChevronRight className="view-all-link__icon" />
            </button>
          </div>
          
          <div className="dashboard-card__body">
            {data?.recentOrders?.length > 0 ? (
              <div>
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="order-item">
                    <div className="order-item__info">
                      <div className="order-item__avatar">
                        #{order.id.toString().slice(-4)}
                      </div>
                      <div className="order-item__details">
                        <p className="order-item__name">{order.customer_name || 'Cliente Avulso'}</p>
                        <p className="order-item__type">{order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega em Domicílio'}</p>
                      </div>
                    </div>
                    <div className="order-item__value">
                      <p className="order-item__total">{formatCurrency(order.total)}</p>
                      <span className={`badge badge--${getStatusVariant(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                Nenhum pedido processado hoje.
              </div>
            )}
          </div>
        </section>

        {/* Inventory Alarms */}
        <section className="dashboard-card">
          <div className="dashboard-card__header">
            <h3 className="dashboard-card__title">
              <FiAlertCircle className="dashboard-card__title-icon" style={{ color: 'var(--danger-500)' }} />
              Alertas de Inventário
            </h3>
            {data?.lowStock?.length > 0 && (
              <span className="critical-badge">
                {data.lowStock.length} itens críticos
              </span>
            )}
          </div>
          
          <div className="dashboard-card__body">
            {data?.lowStock?.length > 0 ? (
              <div>
                {data.lowStock.map((product) => (
                  <div key={product.id} className="stock-alert">
                    <div className="stock-alert__info">
                      <div className="stock-alert__icon">
                        <FiPackage />
                      </div>
                      <div className="stock-alert__details">
                        <p className="stock-alert__name">{product.name}</p>
                        <div className="stock-alert__quantity">
                          <span className="stock-alert__quantity-value">Disponível: {product.quantity}</span>
                          <span className="stock-alert__quantity-separator"></span>
                          <span className="stock-alert__quantity-min">Mínimo: {product.min_stock}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push(`/admin/estoque?edit=${product.id}`)}
                      className="stock-alert__action"
                    >
                      Solicitar Reposição
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty dashboard-empty--centered">
                <div className="dashboard-empty__icon--success">
                  <FiPackage />
                </div>
                <p>Todos os níveis de estoque estão estáveis.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <AdminAssistant />
    </div>
  );
}