'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getServices, formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/api';
import Modal from '@/components/Modal';
import { FiTool } from 'react-icons/fi';

export default function ClienteServicosPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getServices(user.id).then(setServices).catch(console.error).finally(() => setLoading(false));
    }
  }, [user]);

  const getStatusSteps = (status) => {
    const steps = ['pendente', 'em_andamento', 'concluido', 'entregue'];
    const currentIndex = steps.indexOf(status);
    return steps.map((step, i) => ({ label: getStatusLabel(step), completed: i <= currentIndex, active: i === currentIndex }));
  };

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-2)' }}>Meus Serviços</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-8)' }}>Acompanhe o status dos seus serviços</p>

      {services.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {services.map(s => {
            const prods = typeof s.products_used === 'string' ? JSON.parse(s.products_used) : (s.products_used || []);
            return (
              <div key={s.id} className="card card--clickable" onClick={() => { setSelectedService({...s, products_used: prods}); setDetailOpen(true); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '2px' }}>{s.description}</h3>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>{s.device} • Criado em {formatDate(s.created_at)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <span className={`badge badge--${getStatusVariant(s.status)}`}>{getStatusLabel(s.status)}</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(s.value)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0', marginTop: 'var(--space-3)' }}>
                  {getStatusSteps(s.status).map((step, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 4, background: step.completed ? 'var(--primary-500)' : 'var(--gray-200)', borderRadius: i === 0 ? '2px 0 0 2px' : i === 3 ? '0 2px 2px 0' : '0', marginBottom: 'var(--space-2)' }} />
                      <span style={{ fontSize: '0.6875rem', color: step.active ? 'var(--primary-600)' : step.completed ? 'var(--gray-600)' : 'var(--gray-400)', fontWeight: step.active ? 700 : 400 }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}><FiTool style={{ fontSize: '2rem', color: 'var(--gray-300)', marginBottom: 'var(--space-3)' }} /><p style={{ color: 'var(--gray-500)' }}>Você não tem serviços registrados</p></div>
      )}

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detalhes do Serviço" size="lg">
        {selectedService && (
          <div>
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Serviço</span><div style={{ fontWeight: 600 }}>{selectedService.description}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Dispositivo</span><div style={{ fontWeight: 600 }}>{selectedService.device}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Status</span><div><span className={`badge badge--${getStatusVariant(selectedService.status)}`}>{getStatusLabel(selectedService.status)}</span></div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Valor</span><div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{formatCurrency(selectedService.value)}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Prazo</span><div style={{ fontWeight: 600 }}>{formatDate(selectedService.deadline)}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Criado em</span><div style={{ fontWeight: 600 }}>{formatDate(selectedService.created_at)}</div></div>
            </div>
            {selectedService.products_used?.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}><h4 style={{ marginBottom: 'var(--space-2)' }}>Peças</h4><table><thead><tr><th>Item</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>
                {selectedService.products_used.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.quantity}</td><td>{formatCurrency(p.price * p.quantity)}</td></tr>)}
              </tbody></table></div>
            )}
            {selectedService.notes && <div><h4 style={{ marginBottom: 'var(--space-2)' }}>Observações</h4><p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', background: 'var(--gray-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>{selectedService.notes}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
