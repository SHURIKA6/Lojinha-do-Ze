'use client';

import { useState, useEffect } from 'react';
import { getPayments, getCustomers, createPayment, registerPayment, formatCurrency, formatDate, getStatusLabel, getStatusVariant, getPaymentMethodLabel } from '@/lib/api';
import Modal from '@/components/Modal';
import { FiPlus, FiSearch, FiCreditCard, FiCheck } from 'react-icons/fi';

const methods = [
  { value: 'pix', label: 'PIX' }, { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' }, { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
];

export default function PagamentosPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ customer_id: '', description: '', total_value: 0, method: 'pix', installments: 1 });
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('pix');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pays, custs] = await Promise.all([getPayments(), getCustomers()]);
      setPayments(pays);
      setCustomers(custs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = payments.filter(p => {
    const matchSearch = (p.customer_name || '').toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPending = payments.filter(p => p.status !== 'pago').reduce((s, p) => s + parseFloat(p.remaining_value), 0);
  const totalReceived = payments.filter(p => p.status === 'pago').reduce((s, p) => s + parseFloat(p.total_value), 0);

  const openPay = (payment) => {
    setSelectedPayment(payment);
    setPayAmount(parseFloat(payment.remaining_value));
    setPayMethod(payment.method || 'pix');
    setPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedPayment || payAmount <= 0) return;
    try {
      await registerPayment(selectedPayment.id, payAmount, payMethod);
      setPayModal(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleCreate = async () => {
    if (!form.description || !form.total_value) return;
    try {
      const customer = customers.find(c => c.id == form.customer_id);
      await createPayment({ ...form, customer_name: customer?.name || '' });
      setModalOpen(false);
      setForm({ customer_id: '', description: '', total_value: 0, method: 'pix', installments: 1 });
      loadData();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div><h1>Pagamentos</h1><p className="page-header__subtitle">{payments.length} pagamentos registrados</p></div>
        <div className="page-header__actions"><button className="btn btn--primary" onClick={() => setModalOpen(true)}><FiPlus /> Novo Pagamento</button></div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}><FiCheck /></div>
          <div className="metric-card__content"><div className="metric-card__label">Total Recebido</div><div className="metric-card__value" style={{ color: 'var(--success-600)' }}>{formatCurrency(totalReceived)}</div></div>
        </div>
        <div className="metric-card" style={{ '--metric-color': 'var(--warning-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}><FiCreditCard /></div>
          <div className="metric-card__content"><div className="metric-card__label">Total Pendente</div><div className="metric-card__value" style={{ color: 'var(--warning-600)' }}>{formatCurrency(totalPending)}</div></div>
        </div>
        <div className="metric-card" style={{ '--metric-color': 'var(--primary-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}><FiCreditCard /></div>
          <div className="metric-card__content"><div className="metric-card__label">Total Geral</div><div className="metric-card__value">{formatCurrency(totalReceived + totalPending)}</div></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>Todos</button>
        <button className={`tab ${statusFilter === 'pago' ? 'active' : ''}`} onClick={() => setStatusFilter('pago')}>Pagos</button>
        <button className={`tab ${statusFilter === 'parcial' ? 'active' : ''}`} onClick={() => setStatusFilter('parcial')}>Parciais</button>
        <button className={`tab ${statusFilter === 'pendente' ? 'active' : ''}`} onClick={() => setStatusFilter('pendente')}>Pendentes</button>
      </div>

      <div className="filter-bar"><div className="table-search"><FiSearch className="table-search__icon" /><input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      <div className="table-container"><div className="table-responsive">
        <table>
          <thead><tr><th>Cliente</th><th>Descrição</th><th>Total</th><th>Pago</th><th>Restante</th><th>Método</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.customer_name}</td>
                <td style={{ fontSize: 'var(--font-sm)' }}>{p.description}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(p.total_value)}</td>
                <td style={{ color: 'var(--success-600)', fontWeight: 600 }}>{formatCurrency(p.paid_value)}</td>
                <td style={{ color: parseFloat(p.remaining_value) > 0 ? 'var(--danger-500)' : 'var(--gray-400)', fontWeight: 600 }}>{formatCurrency(p.remaining_value)}</td>
                <td><span className="badge badge--neutral">{getPaymentMethodLabel(p.method)}</span></td>
                <td><span className={`badge badge--${getStatusVariant(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                <td>{p.status !== 'pago' && <button className="btn btn--success btn--sm" onClick={() => openPay(p)}><FiCheck /> Pagar</button>}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="table-empty">Nenhum pagamento encontrado</td></tr>}
          </tbody>
        </table>
      </div></div>

      {/* Pay Modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Registrar Pagamento"
        footer={<><button className="btn btn--secondary" onClick={() => setPayModal(false)}>Cancelar</button><button className="btn btn--success" onClick={handlePay}><FiCheck /> Confirmar</button></>}>
        {selectedPayment && (
          <div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{selectedPayment.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)' }}>
                <span>Total: <strong>{formatCurrency(selectedPayment.total_value)}</strong></span>
                <span>Pago: <strong style={{ color: 'var(--success-600)' }}>{formatCurrency(selectedPayment.paid_value)}</strong></span>
                <span>Restante: <strong style={{ color: 'var(--danger-500)' }}>{formatCurrency(selectedPayment.remaining_value)}</strong></span>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Valor</label><input className="form-input" type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} /></div>
              <div className="form-group"><label className="form-label">Método</label><select className="form-select" value={payMethod} onChange={e => setPayMethod(e.target.value)}>{methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Pagamento"
        footer={<><button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn--primary" onClick={handleCreate}>Criar</button></>}>
        <div className="form-group"><label className="form-label">Cliente</label><select className="form-select" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}><option value="">Selecionar</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descrição" /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Valor Total (R$)</label><input className="form-input" type="number" step="0.01" value={form.total_value} onChange={e => setForm({...form, total_value: parseFloat(e.target.value) || 0})} /></div>
          <div className="form-group"><label className="form-label">Parcelas</label><input className="form-input" type="number" min="1" value={form.installments} onChange={e => setForm({...form, installments: parseInt(e.target.value) || 1})} /></div>
        </div>
      </Modal>
    </div>
  );
}
