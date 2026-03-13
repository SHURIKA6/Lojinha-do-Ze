'use client';

import { useEffect, useState } from 'react';
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
import {
  FiAlertCircle,
  FiBarChart2,
  FiDollarSign,
  FiPackage,
  FiPieChart,
  FiShoppingBag,
  FiTrendingUp,
} from 'react-icons/fi';
import { getDashboard, formatCurrency, getStatusLabel, getStatusVariant } from '@/lib/api';
import { CHART_COLORS } from '@/styles/theme';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((response) => setData(response))
      .catch((err) => {
        console.error(err);
        setError('Não foi possível carregar os dados do dashboard. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-loader" style={{ minHeight: '60vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <FiAlertCircle />
        </div>
        <p>{error}</p>
        <button className="btn btn--secondary" onClick={() => window.location.reload()}>
          Recarregar página
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const stats = [
    {
      label: 'Receita do mês',
      value: formatCurrency(data.monthRevenue),
      tone: 'var(--success-500)',
      icon: FiDollarSign,
    },
    {
      label: 'Vendas concluídas',
      value: data.totalSales,
      tone: 'var(--primary-500)',
      icon: FiShoppingBag,
    },
    {
      label: 'Pedidos ativos',
      value: data.activeOrders,
      tone: 'var(--info-500)',
      icon: FiPackage,
    },
    {
      label: 'Lucro no mês',
      value: formatCurrency(data.profit),
      tone: 'var(--warning-500)',
      icon: FiTrendingUp,
    },
  ];

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiBarChart2 />
            Operação
          </span>
          <h1>Dashboard</h1>
          <p className="page-header__subtitle">
            Visão geral de vendas, pedidos e composição do catálogo em um painel mais legível.
          </p>
        </div>
      </div>

      <div className="grid grid-4">
        {stats.map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="metric-card" style={{ '--metric-color': tone }}>
            <div className="metric-card__icon">
              <Icon />
            </div>
            <div className="metric-card__content">
              <div className="metric-card__label">{label}</div>
              <div className="metric-card__value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <h3>Fluxo financeiro</h3>
              <p className="page-header__subtitle">Receitas e despesas registradas ao longo do mês.</p>
            </div>
          </div>

          <div className="chart-panel__body">
            {data.chartData?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 57, 47, 0.12)" />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(value || 0)} />
                  <Bar dataKey="receita" fill="var(--success-500)" radius={[8, 8, 0, 0]} name="Receita" />
                  <Bar dataKey="despesa" fill="var(--danger-400)" radius={[8, 8, 0, 0]} name="Despesa" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <FiBarChart2 />
                </div>
                <p>Sem dados financeiros para este período.</p>
              </div>
            )}
          </div>
        </div>

        <div className="surface-stack">
          <div className="panel chart-panel">
            <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
              <div>
                <h3>Categorias do catálogo</h3>
                <p className="page-header__subtitle">Distribuição dos produtos cadastrados.</p>
              </div>
            </div>

            <div className="chart-panel__body">
              {data.categoryChart?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.categoryChart}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {data.categoryChart.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <FiPieChart />
                  </div>
                  <p>Sem dados suficientes de catálogo.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mini-stat-grid">
            <div className="mini-stat">
              <div className="mini-stat__label">Pedidos recentes</div>
              <div className="mini-stat__value">{data.recentOrders?.length || 0}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat__label">Itens com estoque baixo</div>
              <div className="mini-stat__value">{data.lowStock?.length || 0}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat__label">Total de categorias</div>
              <div className="mini-stat__value">{data.categoryChart?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="table-container">
          <div className="table-header">
            <h3 className="table-header__title">Pedidos recentes</h3>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders?.length ? (
                  data.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.customer_name || 'Cliente avulso'}</td>
                      <td>{order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega'}</td>
                      <td>
                        <span className={`badge badge--${getStatusVariant(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800 }}>{formatCurrency(order.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      Nenhum pedido recente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3 className="table-header__title">Estoque baixo</h3>
            <span className="badge badge--danger">{data.lowStock?.length || 0} itens</span>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Atual</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock?.length ? (
                  data.lowStock.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td style={{ fontWeight: 800 }}>{product.quantity}</td>
                      <td>{product.min_stock}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="table-empty">
                      Estoque em dia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
