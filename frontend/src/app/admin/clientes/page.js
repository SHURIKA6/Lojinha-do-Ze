'use client';

import { useState, useEffect } from 'react';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  resetCustomerPassword,
  deleteCustomer,
  getOrders,
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusVariant,
} from '@/lib/api';
import Modal from '@/components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiUser, FiKey } from 'react-icons/fi';

export default function ClientesPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedAccess, setGeneratedAccess] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '', address: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setCustomers(await getCustomers());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email && c.email.toLowerCase().includes(search.toLowerCase())) || (c.phone && c.phone.includes(search)));

  const openNew = () => {
    setEditingCustomer(null);
    setForm({ name: '', email: '', phone: '', cpf: '', address: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingCustomer(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', cpf: c.cpf || '', address: c.address || '', notes: c.notes || '' });
    setModalOpen(true);
  };

  const openDetail = async (c) => {
    setSelectedCustomer(c);
    try {
      const allOrders = await getOrders();
      // Filter by phone since we refactored user tracking to phone numbers
      const cOrders = allOrders.filter(o => o.customer_phone === c.phone);
      setCustomerOrders(cOrders);
    } catch (err) { console.error(err); }
    setDetailOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingCustomer) await updateCustomer(editingCustomer.id, form);
      else {
        const createdCustomer = await createCustomer(form);
        if (createdCustomer.generatedPassword) {
          setGeneratedAccess({
            name: createdCustomer.name,
            identifier: createdCustomer.email || createdCustomer.phone || 'sem identificador',
            password: createdCustomer.generatedPassword,
          });
        }
      }
      setModalOpen(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleResetPassword = async (customer) => {
    if (!confirm(`Gerar uma nova senha temporária para ${customer.name}?`)) return;
    try {
      const result = await resetCustomerPassword(customer.id);
      setGeneratedAccess({
        name: result.name,
        identifier: result.email || result.phone || 'sem identificador',
        password: result.generatedPassword,
      });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
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
        <div className="table-search"><FiSearch className="table-search__icon" /><input placeholder="Buscar por nome, telefone ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead><tr><th>Cliente</th><th>Telefone</th><th>E-mail</th><th>Desde</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{c.avatar || 'U'}</div>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </div></td>
                  <td style={{ fontWeight: 600 }}>{c.phone}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{c.email || '—'}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{formatDate(c.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--secondary btn--sm" aria-label="Ver detalhes do cliente" onClick={() => openDetail(c)}><FiEye /></button>
                      <button className="btn btn--secondary btn--sm" aria-label="Editar cliente" onClick={() => openEdit(c)}><FiEdit2 /></button>
                      <button className="btn btn--secondary btn--sm" aria-label="Gerar senha temporária" onClick={() => handleResetPassword(c)} title="Gerar senha temporária"><FiKey /></button>
                      <button className="btn btn--danger btn--sm" aria-label="Excluir cliente" onClick={() => handleDelete(c.id)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="table-empty">Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedCustomer?.name || 'Detalhes do Cliente'} size="lg">
        {selectedCustomer && (
          <div>
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-3)' }}>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Telefone</span><div style={{ fontWeight: 600 }}>{selectedCustomer.phone}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>E-mail</span><div style={{ fontWeight: 600 }}>{selectedCustomer.email || '—'}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Endereço Padrão</span><div style={{ fontWeight: 600 }}>{selectedCustomer.address || '—'}</div></div>
            </div>
            
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Histórico de Pedidos ({customerOrders.length})</h4>
            <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ marginBottom: 'var(--space-5)' }}>
                <thead><tr><th>Data</th><th>Tipo</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {customerOrders.map(o => (
                  <tr key={o.id}>
                    <td>{formatDate(o.created_at)}</td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>{o.delivery_type === 'retirada' ? 'Retirada' : 'Entrega'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(o.total)}</td>
                    <td><span className={`badge badge--${getStatusVariant(o.status)}`}>{getStatusLabel(o.status)}</span></td>
                  </tr>
                ))}
                {customerOrders.length === 0 && <tr><td colSpan={4} className="table-empty">Nenhum pedido realizado</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
        footer={<><button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn--primary" onClick={handleSave}>{editingCustomer ? 'Salvar' : 'Criar'}</button></>}>
        <div className="form-group"><label className="form-label">Nome Completo</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(11) 99999-9999" /></div>
          <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="cliente@email.com" /></div>
        </div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-3)' }}>
          Informe ao menos um e-mail ou telefone. O cliente fara login com esse identificador e uma senha temporaria gerada pela loja.
        </div>
        <div className="form-group"><label className="form-label">Endereço de Entrega</label><input className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Rua, Número, Bairro..." /></div>
        <div className="form-group"><label className="form-label">Observações</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Preferências do cliente..." /></div>
      </Modal>

      <Modal
        isOpen={!!generatedAccess}
        onClose={() => setGeneratedAccess(null)}
        title="Senha temporária gerada"
        footer={<button className="btn btn--primary" onClick={() => setGeneratedAccess(null)}>Fechar</button>}
      >
        {generatedAccess && (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>
              Compartilhe estes dados com <strong>{generatedAccess.name}</strong>.
            </p>
            <div className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)' }}>Login</div>
              <div style={{ fontWeight: 700 }}>{generatedAccess.identifier}</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)' }}>Senha temporária</div>
              <div style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{generatedAccess.password}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
