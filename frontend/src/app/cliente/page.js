'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrders, formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/api';
import { FiClock, FiCheckCircle, FiPackage, FiTruck } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function ClienteDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getOrders()
        .then(data => setOrders(Array.isArray(data) ? data : []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  const validOrders = Array.isArray(orders) ? orders : [];
  const completedOrders = validOrders.filter(o => o.status === 'concluido' || o.status === 'cancelado');
  
  // count active statuses
  const pendingCount = validOrders.filter(o => ['novo', 'recebido'].includes(o.status)).length;
  const preparingCount = validOrders.filter(o => o.status === 'em_preparo').length;
  const deliveringCount = validOrders.filter(o => o.status === 'saiu_entrega').length;

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-1)' }}>Olá, {user?.name?.split(' ')[0]}! 👋</h1>
        <p style={{ color: 'var(--gray-500)' }}>Acompanhe o status das suas marmitas</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card" style={{ '--metric-color': 'var(--warning-500)' }}><div className="metric-card__icon" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}><FiClock /></div><div className="metric-card__content"><div className="metric-card__label">Na Fila</div><div className="metric-card__value">{pendingCount}</div></div></div>
        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' }}><div className="metric-card__icon" style={{ background: 'var(--info-50)', color: 'var(--info-600)' }}><FiPackage /></div><div className="metric-card__content"><div className="metric-card__label">Em Preparo</div><div className="metric-card__value">{preparingCount}</div></div></div>
        <div className="metric-card" style={{ '--metric-color': 'var(--primary-500)' }}><div className="metric-card__icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}><FiTruck /></div><div className="metric-card__content"><div className="metric-card__label">A Caminho</div><div className="metric-card__value">{deliveringCount}</div></div></div>
        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' }}><div className="metric-card__icon" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}><FiCheckCircle /></div><div className="metric-card__content"><div className="metric-card__label">Concluídos</div><div className="metric-card__value">{completedOrders.length}</div></div></div>
      </div>

      <div className="grid grid-1">
        <div className="table-container">
          <div className="table-header"><h3 className="table-header__title">Seus Pedidos</h3></div>
          <div className="table-responsive"><table><thead><tr><th>Pedido</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Status</th><th>Data</th></tr></thead><tbody>
            {validOrders.length > 0 ? validOrders.map(o => {
              let itemsLabel = '';
              try { const items = JSON.parse(o.items || '[]'); itemsLabel = items.map(i => `${i.quantity}x ${i.name}`).join(', '); } catch(e) {}
              return (
              <tr key={o.id}>
                <td><div style={{ fontWeight: 600 }}>#{o.id}</div><div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-400)' }}>{o.delivery_type === 'retirada' ? '🏪 Retirada' : '🛵 Entrega'}</div></td>
                <td><div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{itemsLabel}</div></td>
                <td><div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>{o.payment_method === 'pix' ? 'PIX' : (o.payment_method === 'maquininha' ? 'Maquininha' : o.payment_method)}</div></td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(o.total)}</td>
                <td><span className={`badge badge--${getStatusVariant(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                <td style={{ fontSize: 'var(--font-xs)' }}>{formatDate(o.created_at)}</td>
              </tr>
            )}) : <tr><td colSpan={6} className="table-empty" style={{ padding: '2rem' }}>Você ainda não fez nenhum pedido.</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
}
