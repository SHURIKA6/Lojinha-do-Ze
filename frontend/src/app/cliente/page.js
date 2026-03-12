'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getServices, formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/api';
import { getPayments } from '@/lib/api';
import { FiTool, FiCreditCard, FiClock, FiCheckCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function ClienteDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([getServices(user.id), getPayments(user.id)])
        .then(([svcs, pays]) => { setServices(svcs); setPayments(pays); })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  const activeServices = services.filter(s => s.status === 'em_andamento' || s.status === 'pendente');
  const completedServices = services.filter(s => s.status === 'concluido' || s.status === 'entregue');
  const pendingPayments = payments.filter(p => p.status !== 'pago');
  const totalPending = pendingPayments.reduce((s, p) => s + parseFloat(p.remaining_value), 0);

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-1)' }}>Olá, {user?.name?.split(' ')[0]}! 👋</h1>
        <p style={{ color: 'var(--gray-500)' }}>Bem-vindo(a) à sua área do cliente</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' }}><div className="metric-card__icon" style={{ background: 'var(--info-50)', color: 'var(--info-600)' }}><FiTool /></div><div className="metric-card__content"><div className="metric-card__label">Serviços Ativos</div><div className="metric-card__value">{activeServices.length}</div></div></div>
        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' }}><div className="metric-card__icon" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}><FiCheckCircle /></div><div className="metric-card__content"><div className="metric-card__label">Concluídos</div><div className="metric-card__value">{completedServices.length}</div></div></div>
        <div className="metric-card" style={{ '--metric-color': 'var(--warning-500)' }}><div className="metric-card__icon" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}><FiClock /></div><div className="metric-card__content"><div className="metric-card__label">Pagamentos Pendentes</div><div className="metric-card__value">{pendingPayments.length}</div></div></div>
        <div className="metric-card" style={{ '--metric-color': 'var(--danger-500)' }}><div className="metric-card__icon" style={{ background: 'var(--danger-50)', color: 'var(--danger-500)' }}><FiCreditCard /></div><div className="metric-card__content"><div className="metric-card__label">Valor Pendente</div><div className="metric-card__value">{formatCurrency(totalPending)}</div></div></div>
      </div>

      <div className="grid grid-2">
        <div className="table-container">
          <div className="table-header"><h3 className="table-header__title">Serviços em Andamento</h3><button className="btn btn--secondary btn--sm" onClick={() => router.push('/cliente/servicos')}>Ver todos</button></div>
          <div className="table-responsive"><table><thead><tr><th>Serviço</th><th>Status</th><th>Prazo</th></tr></thead><tbody>
            {activeServices.length > 0 ? activeServices.map(s => (
              <tr key={s.id}><td><div style={{ fontWeight: 600 }}>{s.description}</div><div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-400)' }}>{s.device}</div></td>
                <td><span className={`badge badge--${getStatusVariant(s.status)}`}>{getStatusLabel(s.status)}</span></td>
                <td style={{ fontSize: 'var(--font-xs)' }}>{formatDate(s.deadline)}</td></tr>
            )) : <tr><td colSpan={3} className="table-empty" style={{ padding: '2rem' }}>Nenhum serviço ativo</td></tr>}
          </tbody></table></div>
        </div>
        <div className="table-container">
          <div className="table-header"><h3 className="table-header__title">Pagamentos Pendentes</h3><button className="btn btn--secondary btn--sm" onClick={() => router.push('/cliente/pagamentos')}>Ver todos</button></div>
          <div className="table-responsive"><table><thead><tr><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead><tbody>
            {pendingPayments.length > 0 ? pendingPayments.map(p => (
              <tr key={p.id}><td style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{p.description}</td>
                <td style={{ fontWeight: 700, color: 'var(--danger-500)' }}>{formatCurrency(p.remaining_value)}</td>
                <td><span className={`badge badge--${getStatusVariant(p.status)}`}>{getStatusLabel(p.status)}</span></td></tr>
            )) : <tr><td colSpan={3} className="table-empty" style={{ padding: '2rem' }}>Tudo em dia! 🎉</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
}
