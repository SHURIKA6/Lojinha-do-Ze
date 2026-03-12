'use client';

import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getServices, getPayments, formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/api';
import Modal from '@/components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiUser } from 'react-icons/fi';

export default function ClientesPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerServices, setCustomerServices] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '', address: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setCustomers(await getCustomers());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => {
    setEditingCustomer(null);
    setForm({ name: '', email: '', phone: '', cpf: '', address: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingCustomer(c);
    setForm({ name: c.name, email: c.email, phone: c.phone || '', cpf: c.cpf || '', address: c.address || '', notes: c.notes || '' });
    setModalOpen(true);
  };

  const openDetail = async (c) => {
    setSelectedCustomer(c);
    try {
      const [svcs, pays] = await Promise.all([getServices(c.id), getPayments(c.id)]);
      setCustomerServices(svcs);
      setCustomerPayments(pays);
    } catch (err) { console.error(err); }
    setDetailOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingCustomer) await updateCustomer(editingCustomer.id, form);
      else await createCustomer(form);
      setModalOpen(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este cliente?')) return;
    try { await deleteCustomer(id); loadData(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div><h1>Clientes</h1><p className="page-header__subtitle">{customers.length} clientes cadastrados</p></div>
        <div className="page-header__actions"><button className="btn btn--primary" onClick={openNew}><FiPlus /> Novo Cliente</button></div>
      </div>

      <div className="filter-bar">
        <div className="table-search"><FiSearch className="table-search__icon" /><input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead><tr><th>Cliente</th><th>Telefone</th><th>E-mail</th><th>CPF</th><th>Desde</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{c.avatar || 'U'}</div>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </div></td>
                  <td>{c.phone}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{c.email}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{c.cpf || '—'}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{formatDate(c.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--secondary btn--sm" onClick={() => openDetail(c)}><FiEye /></button>
                      <button className="btn btn--secondary btn--sm" onClick={() => openEdit(c)}><FiEdit2 /></button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(c.id)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="table-empty">Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedCustomer?.name || 'Detalhes'} size="lg">
        {selectedCustomer && (
          <div>
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-3)' }}>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Telefone</span><div style={{ fontWeight: 600 }}>{selectedCustomer.phone}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>E-mail</span><div style={{ fontWeight: 600 }}>{selectedCustomer.email}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>CPF</span><div style={{ fontWeight: 600 }}>{selectedCustomer.cpf || '—'}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Endereço</span><div style={{ fontWeight: 600 }}>{selectedCustomer.address || '—'}</div></div>
            </div>
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Serviços ({customerServices.length})</h4>
            <table style={{ marginBottom: 'var(--space-5)' }}><thead><tr><th>Serviço</th><th>Status</th><th>Valor</th></tr></thead>
              <tbody>{customerServices.map(s => (
                <tr key={s.id}><td>{s.description}</td><td><span className={`badge badge--${getStatusVariant(s.status)}`}>{getStatusLabel(s.status)}</span></td><td style={{ fontWeight: 600 }}>{formatCurrency(s.value)}</td></tr>
              ))}{customerServices.length === 0 && <tr><td colSpan={3} className="table-empty">Sem serviços</td></tr>}</tbody>
            </table>
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Pagamentos ({customerPayments.length})</h4>
            <table><thead><tr><th>Descrição</th><th>Pago</th><th>Pendente</th><th>Status</th></tr></thead>
              <tbody>{customerPayments.map(p => (
                <tr key={p.id}><td>{p.description}</td><td style={{ color: 'var(--success-600)' }}>{formatCurrency(p.paid_value)}</td><td style={{ color: 'var(--danger-500)' }}>{formatCurrency(p.remaining_value)}</td><td><span className={`badge badge--${getStatusVariant(p.status)}`}>{getStatusLabel(p.status)}</span></td></tr>
              ))}{customerPayments.length === 0 && <tr><td colSpan={4} className="table-empty">Sem pagamentos</td></tr>}</tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
        footer={<><button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn--primary" onClick={handleSave}>{editingCustomer ? 'Salvar' : 'Criar'}</button></>}>
        <div className="form-group"><label className="form-label">Nome</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">CPF</label><input className="form-input" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Endereço</label><input className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
        </div>
        <div className="form-group"><label className="form-label">Observações</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
      </Modal>
    </div>
  );
}
