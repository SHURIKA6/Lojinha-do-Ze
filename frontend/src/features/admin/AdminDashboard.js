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
import styles from './AdminDashboard.module.css';

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
      <div className="admin-dashboard-loading animate-pulse p-6">
        <div className="h-10 w-64 bg-slate-200 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-100 rounded-2xl shadow-sm border border-slate-100 p-6"></div>
          <div className="h-96 bg-slate-100 rounded-2xl shadow-sm border border-slate-100 p-6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error p-12 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo deu errado</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
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
      color: 'bg-emerald-50 text-emerald-600',
      icon: <FiDollarSign />
    },
    {
      label: 'Vendas Concluídas',
      value: data?.totalSales || 0,
      color: 'bg-blue-50 text-blue-600',
      icon: <FiShoppingBag />
    },
    {
      label: 'Pedidos Ativos',
      value: data?.activeOrders || 0,
      color: 'bg-orange-50 text-orange-600',
      icon: <FiPackage />
    },
    {
      label: 'Lucro Previsto',
      value: formatCurrency(data?.profit || 0),
      color: 'bg-indigo-50 text-indigo-600',
      icon: <FiTrendingUp />
    }
  ];

  return (
    <div className="admin-dashboard px-6 py-8 animate-fadeIn">
      {/* Welcome Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-[#21362f] tracking-tight">Painel Operacional</h1>
        <p className="text-[#64748b]">Olá, {user?.name || 'Administrador'}. Aqui está o panorama do mês atual.</p>
      </header>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {metrics.map((stat, idx) => (
          <div key={idx} className="metric-card group hover:scale-[1.02] transition-transform">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 leading-tight">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiBarChart2 className="text-blue-500" /> Fluxo Financeiro Diário
            </h3>
          </div>
          <div className="h-[300px] w-full">
            {data?.chartData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FiBarChart2 size={40} className="mb-2 opacity-20" />
                <p className="italic">Sem dados suficientes para gerar o gráfico.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <FiPieChart className="text-indigo-500" /> Categorias
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
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
              <div className="text-center text-slate-400">
                <FiPieChart size={40} className="mx-auto mb-2 opacity-20" />
                <p className="italic text-sm">Sem categorias cadastradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Orders - Premium Style */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiClock className="text-orange-500" /> Pedidos Recentes
            </h3>
            <button 
              onClick={() => router.push('/admin/pedidos')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-1 group"
            >
              Ver tudo <FiChevronRight className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          
          <div className="p-2">
            {data?.recentOrders?.length > 0 ? (
              <div className="space-y-1">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="p-4 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">
                        #{order.id.toString().slice(-4)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-none mb-1">{order.customer_name || 'Cliente Avulso'}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase">{order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega em Domicílio'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 mb-1">{formatCurrency(order.total)}</p>
                      <span className={`badge badge--${getStatusVariant(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 italic font-medium">
                Nenhum pedido processado hoje.
              </div>
            )}
          </div>
        </section>

        {/* Inventory Alarms */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FiAlertCircle className="text-red-500" /> Alertas de Inventário
            </h3>
            {data?.lowStock?.length > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                {data.lowStock.length} itens críticos
              </span>
            )}
          </div>
          
          <div className="p-4">
            {data?.lowStock?.length > 0 ? (
              <div className="space-y-3">
                {data.lowStock.map((product) => (
                  <div key={product.id} className="p-4 rounded-xl border border-red-50 bg-red-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center text-red-500 border border-red-100">
                        <FiPackage />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-red-600">Disponível: {product.quantity}</span>
                          <span className="w-1 h-1 bg-red-200 rounded-full"></span>
                          <span className="text-[10px] font-black uppercase text-slate-400">Mínimo: {product.min_stock}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push(`/admin/estoque?edit=${product.id}`)}
                      className="px-4 py-2 bg-white text-red-600 text-[10px] font-black uppercase rounded-lg border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                    >
                      Solicitar Reposição
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiPackage />
                </div>
                <p className="text-slate-400 font-medium italic">Todos os níveis de estoque estão estáveis.</p>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
