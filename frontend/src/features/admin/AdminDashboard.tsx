'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiDollarSign, 
  FiShoppingBag, 
  FiPackage, 
  FiTrendingUp, 
  FiAlertCircle,
  FiBarChart2,
  FiPieChart,
  FiEye,
  FiArrowLeft
} from 'react-icons/fi';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '@/core/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getDashboard, DashboardData } from '@/core/api';
import { formatCurrency, getStatusLabel, getStatusVariant } from '@/core/utils/formatting';
import { CHART_COLORS } from '@/styles/theme';
import AdminAssistant from './AdminAssistant';
import StorefrontPageClient from '../storefront/StorefrontPageClient';


export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      // 1. Tentar carregar do cache para renderização imediata (SWR)
      const cached = localStorage.getItem('lz_dashboard_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setData(parsed);
          setLoading(false); // Já temos algo para mostrar
        } catch (e) {
          localStorage.removeItem('lz_dashboard_cache');
        }
      }

      try {
        if (!data) setLoading(true); // Só mostra loader se não tiver cache
        
        const result = await getDashboard();
        setData(result);
        
        // 2. Salvar no cache para a próxima vez
        localStorage.setItem('lz_dashboard_cache', JSON.stringify(result));
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        if (!data) {
          // Se não tiver nem cache nem dados novos, aí sim mostra erro
          setError('Não foi possível carregar as métricas do dashboard.');
          toast.error('Erro ao carregar os dados do painel.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, toast]); // Removi 'data' da dependência para evitar loop se fosse o caso, mas 'isAdmin' e 'toast' são estáveis.

  if (isPreviewMode) {
    return (
      <div className="admin-preview-wrapper" style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 2000, 
        backgroundColor: 'var(--cream-100)',
        display: 'flex',
        flexDirection: 'column'
      } as React.CSSProperties}>
        <div className="admin-preview-bar" style={{
          backgroundColor: 'var(--forest-600)',
          color: 'white',
          padding: 'var(--space-3) var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)'
        } as React.CSSProperties}>
          <div className="admin-preview-bar__info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FiEye className="admin-preview-bar__icon" />
            <span>Modo de Visualização da Loja (URL mantida)</span>
          </div>
          <button 
            onClick={() => setIsPreviewMode(false)}
            className="btn btn--secondary btn--sm"
          >
            <FiArrowLeft /> Voltar ao Painel
          </button>
        </div>
        <div className="admin-preview-content" style={{ flex: 1, overflow: 'auto' }}>
          <StorefrontPageClient 
            initialCatalog={null}
          />
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="animate-fadeIn surface-stack">
        <div className="app-loader" style={{ minHeight: '40vh' }}>
          <div className="app-loader__spinner" />
          <p>Carregando panorama...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fadeIn surface-stack">
        <div className="page-header">
           <div>
             <span className="page-eyebrow">
               <FiBarChart2 />
               Operação
             </span>
             <h1>Dashboard</h1>
           </div>
         </div>
        <div className="empty-state">
          <div className="empty-state__icon">
            <FiAlertCircle />
          </div>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn--secondary"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Receita do mês',
      value: data ? formatCurrency(data.monthRevenue) : '—',
      tone: 'var(--success-500)',
      icon: FiDollarSign,
    },
    {
      label: 'Vendas concluídas',
      value: data?.totalSales ?? '—',
      tone: 'var(--primary-500)',
      icon: FiShoppingBag,
    },
    {
      label: 'Pedidos ativos',
      value: data?.activeOrders ?? '—',
      tone: 'var(--info-500)',
      icon: FiPackage,
    },
    {
      label: 'Lucro no mês',
      value: data ? formatCurrency(data.profit) : '—',
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
        <div className="page-header__actions">
          <button 
            className="btn btn--secondary btn--sm"
            onClick={() => setIsPreviewMode(true)}
          >
            <FiEye /> Visualizar Loja
          </button>
        </div>
      </div>

      <div className="grid grid-4">
        {metrics.map(({ label, value, tone, icon: Icon }, idx) => (
          <div key={idx} className="metric-card" style={{ '--metric-color': tone } as React.CSSProperties}>
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

      <div className="dashboard-grid" style={{ marginTop: 'var(--space-6)' }}>
        <div className="panel chart-panel">
          <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <h3>Fluxo financeiro</h3>
              <p className="page-header__subtitle">Receitas e despesas registrados ao longo do mês.</p>
            </div>
          </div>

          <div className="chart-panel__body">
            {data?.chartData?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(64, 57, 47, 0.12)" />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: any) => formatCurrency(value || 0)} />
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
              {data?.categoryChart?.length ? (
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
                      {(Array.isArray(data.categoryChart) ? data.categoryChart : []).map((_, index) => (
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
              <div className="mini-stat__value">{data?.recentOrders?.length || 0}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat__label">Itens com estoque baixo</div>
              <div className="mini-stat__value">{data?.lowStock?.length || 0}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat__label">Total de categorias</div>
              <div className="mini-stat__value">{data?.categoryChart?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 'var(--space-6)' }}>
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
                {data?.recentOrders?.length ? (
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
            <span className="badge badge--danger" style={{ background: 'var(--danger-500)', color: 'white' }}>{data?.lowStock?.length || 0} itens</span>
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
                {data?.lowStock?.length ? (
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

      <AdminAssistant />
    </div>
  );
}
