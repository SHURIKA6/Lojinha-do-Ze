'use client';

import { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, formatCurrency, uploadImage, getImageUrl } from '@/lib/api';
import Modal from '@/components/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage, FiAlertTriangle, FiUpload, FiImage } from 'react-icons/fi';

const categories = ['Cápsulas', 'Chás', 'Tinturas', 'Cremes', 'Cosméticos', 'Outros'];

export default function EstoquePage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', description: '', photo: '', category: 'Cápsulas', quantity: 999, min_stock: 0,
    cost_price: 0, sale_price: 0, supplier: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const lowStock = products.filter(p => p.quantity <= p.min_stock).length;

  const openNew = () => {
    setEditingProduct(null);
    setForm({ code: '', name: '', description: '', photo: '', category: 'Cápsulas', quantity: 999, min_stock: 0, cost_price: 0, sale_price: 0, supplier: '' });
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      code: product.code, name: product.name, description: product.description || '', photo: product.photo || '', category: product.category,
      quantity: product.quantity, min_stock: product.min_stock,
      cost_price: product.cost_price, sale_price: product.sale_price, supplier: product.supplier
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form);
      } else {
        await createProduct(form);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este produto?')) return;
    try {
      await deleteProduct(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadImage(file);
      setForm({ ...form, photo: res.url });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Catálogo / Menu</h1>
          <p className="page-header__subtitle">{products.length} itens cadastrados</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={openNew}><FiPlus /> Novo Produto</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="table-search">
          <FiSearch className="table-search__icon" />
          <input placeholder="Buscar por nome ou código..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>Código</th><th>Foto</th><th>Produto</th><th>Categoria</th><th>Disponível</th><th>Custo</th><th>Venda</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><code style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontSize: 'var(--font-xs)' }}>{p.code}</code></td>
                  <td>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.photo ? <img src={getImageUrl(p.photo)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiImage style={{ color: 'var(--gray-400)' }} />}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge badge--neutral">{p.category}</span></td>
                  <td>
                    <span className={`badge ${p.quantity > 0 ? 'badge--success' : 'badge--danger'}`}>
                      {p.quantity > 0 ? 'Ativo' : 'Esgotado'}
                    </span>
                  </td>
                  <td>{formatCurrency(p.cost_price)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{formatCurrency(p.sale_price)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--secondary btn--sm" aria-label="Editar produto" onClick={() => openEdit(p)}><FiEdit2 /></button>
                      <button className="btn btn--danger btn--sm" aria-label="Excluir produto" onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="table-empty">Nenhum produto encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleSave}>{editingProduct ? 'Salvar' : 'Criar'}</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Código</label>
            <input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Ex: TL-001" />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nome do Produto</label>
          <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome do produto" />
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descrição do produto" rows="3" />
        </div>
        <div className="form-group">
          <label className="form-label">Foto do Produto</label>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', border: '1px dashed var(--gray-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--gray-50)' }}>
              {form.photo ? <img src={getImageUrl(form.photo)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FiImage style={{ fontSize: '1.5rem', color: 'var(--gray-400)' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <label className="btn btn--secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <FiUpload style={{ marginRight: 8 }} /> {uploading ? 'Enviando...' : 'Escolher Imagem (R2)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={handlePhotoUpload} />
              </label>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <input className="form-input" value={form.photo} onChange={e => setForm({...form, photo: e.target.value})} placeholder="Ou cole a URL direta da imagem aqui" style={{ fontSize: 'var(--font-xs)', padding: '0.4rem 0.6rem' }} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-group" style={{ background: 'var(--gray-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <input type="checkbox" id="activeToggle" style={{ width: 20, height: 20, cursor: 'pointer' }}
            checked={form.quantity > 0} 
            onChange={e => setForm({...form, quantity: e.target.checked ? 999 : 0, min_stock: 0})} 
          />
          <label htmlFor="activeToggle" style={{ cursor: 'pointer', fontWeight: 600, color: form.quantity > 0 ? 'var(--success-600)' : 'var(--danger-500)' }}>
            {form.quantity > 0 ? '✅ Disponível no Cardápio (Ativo)' : '❌ Esgotado / Escondido'}
          </label>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Preço de Custo (R$)</label>
            <input className="form-input" type="number" step="0.01" value={form.cost_price} onChange={e => setForm({...form, cost_price: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Preço de Venda (R$)</label>
            <input className="form-input" type="number" step="0.01" value={form.sale_price} onChange={e => setForm({...form, sale_price: parseFloat(e.target.value) || 0})} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Fornecedor</label>
          <input className="form-input" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Nome do fornecedor" />
        </div>
      </Modal>
    </div>
  );
}
