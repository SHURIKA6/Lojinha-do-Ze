'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPayments, formatCurrency, formatDate, getStatusLabel, getStatusVariant, getPaymentMethodLabel } from '@/lib/api';
import { FiCreditCard } from 'react-icons/fi';

export default function ClientePagamentosPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getPayments(user.id).then(setPayments).catch(console.error).finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  const totalPaid = payments.filter(p => p.status === 'pago').reduce((s, p) => s + parseFloat(p.total_value), 0);
  const totalPending = payments.filter(p => p.status !== 'pago').reduce((s, p) => s + parseFloat(p.remaining_value), 0);

  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-2)' }}>Meus Pagamentos</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-8)' }}>Histórico e status dos seus pagamentos</p>

      <div className="grid grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)' }}>Total Pago</div><div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--success-600)' }}>{formatCurrency(totalPaid)}</div></div>
        <div className="card" style={{ textAlign: 'center' }}><div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)' }}>Saldo Pendente</div><div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: totalPending > 0 ? 'var(--danger-500)' : 'var(--success-600)' }}>{formatCurrency(totalPending)}</div></div>
      </div>

      {payments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {payments.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div><h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '2px' }}>{p.description}</h3><p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>{p.date ? formatDate(p.date) : 'Aguardando pagamento'} • {getPaymentMethodLabel(p.method)}</p></div>
                <span className={`badge badge--${getStatusVariant(p.status)}`}>{getStatusLabel(p.status)}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-8)', fontSize: 'var(--font-sm)', flexWrap: 'wrap' }}>
                <div><span style={{ color: 'var(--gray-500)' }}>Total: </span><strong>{formatCurrency(p.total_value)}</strong></div>
                <div><span style={{ color: 'var(--gray-500)' }}>Pago: </span><strong style={{ color: 'var(--success-600)' }}>{formatCurrency(p.paid_value)}</strong></div>
                {parseFloat(p.remaining_value) > 0 && <div><span style={{ color: 'var(--gray-500)' }}>Restante: </span><strong style={{ color: 'var(--danger-500)' }}>{formatCurrency(p.remaining_value)}</strong></div>}
              </div>
              {parseFloat(p.remaining_value) > 0 && (
                <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>💬 Entre em contato para efetuar o pagamento</div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}><FiCreditCard style={{ fontSize: '2rem', color: 'var(--gray-300)', marginBottom: 'var(--space-3)' }} /><p style={{ color: 'var(--gray-500)' }}>Nenhum pagamento registrado</p></div>
      )}
    </div>
  );
}
