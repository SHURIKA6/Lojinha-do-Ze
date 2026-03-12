'use client';

import { useState, useEffect } from 'react';
import { getDashboard, formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/api';
import { FiDollarSign, FiShoppingBag, FiTool, FiAlertCircle, FiTrendingUp, FiTrendingDown, FiPackage } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ea580c', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']; // orange as first color

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(d => setData(d))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando dashboard...</div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header__subtitle">Visão geral do seu negócio e pedidos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}><FiDollarSign /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Receita do Mês</div>
            <div className="metric-card__value">{formatCurrency(data.monthRevenue)}</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--metric-color': 'var(--primary-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}><FiShoppingBag /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Vendas Concluídas</div>
            <div className="metric-card__value">{data.totalSales}</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--info-50)', color: 'var(--info-600)' }}><FiPackage /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Pedidos Ativos</div>
            <div className="metric-card__value">{data.activeOrders}</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--metric-color': 'var(--warning-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}><FiTrendingUp /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Lucro no Mês</div>
            <div className="metric-card__value">{formatCurrency(data.profit)}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="table-container">
          <div className="table-header"><h3 className="table-header__title">Transações Financeiras</h3></div>
          <div style={{ padding: 'var(--space-4)' }}>
            {data.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(val) => formatCurrency(val)} />
                  <Bar dataKey="receita" fill="var(--success-500)" name="Receita" radius={[4,4,0,0]} />
                  <Bar dataKey="despesa" fill="var(--danger-400)" name="Despesa" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>Sem dados para o mês</div>
            )}
          </div>
        </div>

        <div className="table-container">
          <div className="table-header"><h3 className="table-header__title">Produtos por Categoria</h3></div>
          <div style={{ padding: 'var(--space-4)' }}>
            {data.categoryChart && data.categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.categoryChart} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {data.categoryChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>Sem dados de catálogo</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent & Alerts */}
      <div className="grid grid-2">
        <div className="table-container">
          <div className="table-header"><h3 className="table-header__title">Pedidos Recentes</h3></div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Cliente</th><th>Tipo</th><th>Status</th><th>Valor</th></tr></thead>
              <tbody>
                {data.recentOrders && data.recentOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.customer_name || 'Cliente Avulso'}</td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>{o.delivery_type === 'retirada' ? '🏪 Retirada' : '🛵 Entrega'}</td>
                    <td><span className={`badge badge--${getStatusVariant(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(o.total)}</td>
                  </tr>
                ))}
                {(!data.recentOrders || data.recentOrders.length === 0) && (
                  <tr><td colSpan={4} className="table-empty">Nenhum pedido recente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3 className="table-header__title">Estoque Baixo</h3>
            <span className="badge badge--danger">{(data.lowStock || []).length} itens</span>
          </div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Produto</th><th>Atual</th><th>Mínimo</th></tr></thead>
              <tbody>
                {data.lowStock && data.lowStock.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontWeight: 700, color: p.quantity === 0 ? 'var(--danger-500)' : 'var(--warning-600)' }}>{p.quantity}</td>
                    <td>{p.min_stock}</td>
                  </tr>
                ))}
                {(!data.lowStock || data.lowStock.length === 0) && (
                  <tr><td colSpan={3} className="table-empty">Estoque em dia! ✅</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
