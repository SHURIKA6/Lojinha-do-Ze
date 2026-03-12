'use client';

import { useState, useEffect } from 'react';
import { getServices, getCustomers, getProducts, createService, updateService, updateServiceStatus, deleteService, formatCurrency, formatDate, getStatusLabel, getStatusVariant } from '@/lib/api';
import Modal from '@/components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiTool } from 'react-icons/fi';

const statuses = ['pendente', 'em_andamento', 'concluido', 'entregue'];

export default function ServicosPage() {
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    customer_id: '', customer_name: '', description: '', device: '',
    status: 'pendente', value: 0, cost: 0, notes: '', deadline: '', products_used: []
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [svcs, custs, prods] = await Promise.all([getServices(), getCustomers(), getProducts()]);
      setServices(svcs);
      setCustomers(custs);
      setProducts(prods);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = services.filter(s => {
    const matchSearch = s.customer_name?.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openNew = () => {
    setEditingService(null);
    setForm({ customer_id: '', customer_name: '', description: '', device: '', status: 'pendente', value: 0, cost: 0, notes: '', deadline: '', products_used: [] });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditingService(s);
    const prods = typeof s.products_used === 'string' ? JSON.parse(s.products_used) : (s.products_used || []);
    setForm({
      customer_id: s.customer_id || '', customer_name: s.customer_name, description: s.description,
      device: s.device, status: s.status, value: parseFloat(s.value), cost: parseFloat(s.cost), notes: s.notes || '',
      deadline: s.deadline ? s.deadline.split('T')[0] : '', products_used: prods
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const customer = customers.find(c => c.id == form.customer_id);
      const payload = { ...form, customer_name: customer?.name || form.customer_name };
      if (editingService) {
        await updateService(editingService.id, payload);
      } else {
        await createService(payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await updateServiceStatus(id, newStatus); loadData(); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este serviço?')) return;
    try { await deleteService(id); loadData(); } catch (err) { console.error(err); }
  };

  const addProduct = () => {
    setForm({ ...form, products_used: [...form.products_used, { productId: '', name: '', quantity: 1, price: 0 }] });
  };

  const updateProductItem = (idx, field, value) => {
    const prods = [...form.products_used];
    if (field === 'productId') {
      const product = products.find(p => p.id == value);
      prods[idx] = { ...prods[idx], productId: value, name: product?.name || '', price: parseFloat(product?.sale_price || 0) };
    } else {
      prods[idx] = { ...prods[idx], [field]: field === 'quantity' ? parseInt(value) || 1 : value };
    }
    setForm({ ...form, products_used: prods });
  };

  const removeProduct = (idx) => {
    setForm({ ...form, products_used: form.products_used.filter((_, i) => i !== idx) });
  };

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div><h1>Serviços</h1><p className="page-header__subtitle">{services.length} serviços registrados</p></div>
        <div className="page-header__actions"><button className="btn btn--primary" onClick={openNew}><FiPlus /> Novo Serviço</button></div>
      </div>

      <div className="tabs">
        <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>Todos</button>
        {statuses.map(s => (
          <button key={s} className={`tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{getStatusLabel(s)}</button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="table-search"><FiSearch className="table-search__icon" /><input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead><tr><th>Cliente</th><th>Serviço</th><th>Dispositivo</th><th>Status</th><th>Valor</th><th>Prazo</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(s => {
                const prods = typeof s.products_used === 'string' ? JSON.parse(s.products_used) : (s.products_used || []);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.customer_name}</td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>{s.description}</td>
                    <td>{s.device}</td>
                    <td>
                      <select className="form-select" style={{ minWidth: 130, padding: '4px 8px', fontSize: 'var(--font-xs)' }} value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}>
                        {statuses.map(st => <option key={st} value={st}>{getStatusLabel(st)}</option>)}
                      </select>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(s.value)}</td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>{formatDate(s.deadline)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn--secondary btn--sm" onClick={() => { setSelectedService({...s, products_used: prods}); setDetailOpen(true); }}><FiEye /></button>
                        <button className="btn btn--secondary btn--sm" onClick={() => openEdit(s)}><FiEdit2 /></button>
                        <button className="btn btn--danger btn--sm" onClick={() => handleDelete(s.id)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="table-empty">Nenhum serviço encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detalhes do Serviço" size="lg">
        {selectedService && (
          <div>
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-5)', gap: 'var(--space-3)' }}>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Cliente</span><div style={{ fontWeight: 600 }}>{selectedService.customer_name}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Dispositivo</span><div style={{ fontWeight: 600 }}>{selectedService.device}</div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Status</span><div><span className={`badge badge--${getStatusVariant(selectedService.status)}`}>{getStatusLabel(selectedService.status)}</span></div></div>
              <div><span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Valor</span><div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{formatCurrency(selectedService.value)}</div></div>
            </div>
            {selectedService.notes && <div style={{ background: 'var(--gray-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>{selectedService.notes}</div>}
            {selectedService.products_used?.length > 0 && (
              <div><h4 style={{ marginBottom: 'var(--space-2)' }}>Peças Utilizadas</h4>
                <table><thead><tr><th>Item</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr></thead>
                  <tbody>{selectedService.products_used.map((p, i) => (
                    <tr key={i}><td>{p.name}</td><td>{p.quantity}</td><td>{formatCurrency(p.price)}</td><td style={{ fontWeight: 600 }}>{formatCurrency(p.price * p.quantity)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingService ? 'Editar Serviço' : 'Novo Serviço'} size="lg"
        footer={<><button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn--primary" onClick={handleSave}>{editingService ? 'Salvar' : 'Criar'}</button></>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <select className="form-select" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
              <option value="">Selecionar</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dispositivo</label>
            <input className="form-input" value={form.device} onChange={e => setForm({...form, device: e.target.value})} placeholder="Ex: iPhone 12" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição do Serviço</label>
          <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Troca de tela" />
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Valor (R$)</label><input className="form-input" type="number" step="0.01" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})} /></div>
          <div className="form-group"><label className="form-label">Custo (R$)</label><input className="form-input" type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: parseFloat(e.target.value) || 0})} /></div>
          <div className="form-group"><label className="form-label">Prazo</label><input className="form-input" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></div>
        </div>
        <div className="form-group"><label className="form-label">Observações</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>

        {/* Products */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <label className="form-label" style={{ margin: 0 }}>Peças Utilizadas</label>
            <button type="button" className="btn btn--secondary btn--sm" onClick={addProduct}><FiPlus /> Adicionar Peça</button>
          </div>
          {form.products_used.map((p, i) => (
            <div key={i} className="form-row" style={{ marginBottom: 'var(--space-2)', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 3 }}>
                <select className="form-select" value={p.productId} onChange={e => updateProductItem(i, 'productId', e.target.value)}>
                  <option value="">Selecionar peça</option>
                  {products.map(prod => <option key={prod.id} value={prod.id}>{prod.name} (Est: {prod.quantity})</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input className="form-input" type="number" min="1" value={p.quantity} onChange={e => updateProductItem(i, 'quantity', e.target.value)} />
              </div>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => removeProduct(i)}><FiTrash2 /></button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
