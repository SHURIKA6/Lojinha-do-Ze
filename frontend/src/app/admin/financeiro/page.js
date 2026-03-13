'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmDialogProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getTransactions, createTransaction, deleteTransaction, formatCurrency, formatDate } from '@/lib/api';
import Modal from '@/components/Modal';
import { FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiDollarSign, FiSearch } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'receita', category: '', description: '', value: 0, date: '' });
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Não foi possível carregar as transações.');
    }
    finally { setLoading(false); }
  };

  const filtered = transactions.filter(t => {
    const matchType = !typeFilter || t.type === typeFilter;
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalEntradas = transactions.filter(t => t.type === 'receita').reduce((s, t) => s + parseFloat(t.value), 0);
  const totalSaidas = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + parseFloat(t.value), 0);
  const saldo = totalEntradas - totalSaidas;

  // Chart data
  const chartMap = {};
  transactions.forEach(t => {
    const d = t.date ? new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    if (!d) return;
    if (!chartMap[d]) chartMap[d] = { dia: d, receita: 0, despesa: 0 };
    if (t.type === 'receita') chartMap[d].receita += parseFloat(t.value);
    else chartMap[d].despesa += parseFloat(t.value);
  });
  const chartData = Object.values(chartMap).reverse();

  const handleCreate = async () => {
    try {
      await createTransaction(form);
      setModalOpen(false);
      setForm({ type: 'receita', category: '', description: '', value: 0, date: '' });
      toast.success('Transação lançada com sucesso.');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Não foi possível lançar a transação.');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Excluir transação',
      description: 'Esta ação remove a movimentação financeira.',
      body: 'Tem certeza que deseja excluir esta transação?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });

    if (!confirmed) return;
    try {
      await deleteTransaction(id);
      toast.success('Transação excluída com sucesso.');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Não foi possível excluir a transação.');
    }
  };

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Financeiro</h1>
          <p className="page-header__subtitle">Controle de receitas e despesas livre</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => setModalOpen(true)}><FiPlus /> Nova Transação</button>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--success-50)', color: 'var(--success-600)' }}><FiTrendingUp /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Total Receitas</div>
            <div className="metric-card__value" style={{ color: 'var(--success-600)' }}>{formatCurrency(totalEntradas)}</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--metric-color': 'var(--danger-500)' }}>
          <div className="metric-card__icon" style={{ background: 'var(--danger-50)', color: 'var(--danger-500)' }}><FiTrendingDown /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Total Despesas</div>
            <div className="metric-card__value" style={{ color: 'var(--danger-500)' }}>{formatCurrency(totalSaidas)}</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--metric-color': saldo >= 0 ? 'var(--success-500)' : 'var(--danger-500)' }}>
          <div className="metric-card__icon" style={{ background: saldo >= 0 ? 'var(--success-50)' : 'var(--danger-50)', color: saldo >= 0 ? 'var(--success-600)' : 'var(--danger-500)' }}><FiDollarSign /></div>
          <div className="metric-card__content">
            <div className="metric-card__label">Lucro / Saldo</div>
            <div className="metric-card__value" style={{ color: saldo >= 0 ? 'var(--success-600)' : 'var(--danger-500)' }}>{formatCurrency(saldo)}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="table-container" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="table-header"><h3 className="table-header__title">Fluxo de Caixa (DRE Simplificado)</h3></div>
        <div style={{ padding: 'var(--space-4)' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="var(--success-500)" name="Receita" strokeWidth={2} />
                <Line type="monotone" dataKey="despesa" stroke="var(--danger-400)" name="Despesa" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>Sem dados financeiros lançados.</div>
          )}
        </div>
      </div>

      {/* Filters & Table */}
      <div className="tabs">
        <button className={`tab ${typeFilter === '' ? 'active' : ''}`} onClick={() => setTypeFilter('')}>Todos</button>
        <button className={`tab ${typeFilter === 'receita' ? 'active' : ''}`} onClick={() => setTypeFilter('receita')}>Receitas (Entradas)</button>
        <button className={`tab ${typeFilter === 'despesa' ? 'active' : ''}`} onClick={() => setTypeFilter('despesa')}>Despesas (Saídas)</button>
      </div>

      <div className="filter-bar">
        <div className="table-search">
          <FiSearch className="table-search__icon" />
          <input placeholder="Buscar transações, contas de luz, compras de insumos..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td><span className={`badge ${t.type === 'receita' ? 'badge--success' : 'badge--danger'}`}>{t.type === 'receita' ? 'Receita' : 'Despesa'}</span></td>
                  <td><span className="badge badge--neutral">{t.category}</span></td>
                  <td style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{t.description}</td>
                  <td style={{ fontWeight: 800, color: t.type === 'receita' ? 'var(--success-600)' : 'var(--danger-500)' }}>{formatCurrency(t.value)}</td>
                  <td><button className="btn btn--danger btn--sm" aria-label="Excluir transação" onClick={() => handleDelete(t.id)}><FiTrash2 /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="table-empty">Nenhuma transação financeira encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Lançar Transação / DRE"
        footer={<><button className="btn btn--secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn--primary" onClick={handleCreate}>Lançar</button></>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tipo de Movimentação</label>
            <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="receita">Receita (Entrada livre)</option><option value="despesa">Despesa (Caixa/Gasto)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Ex: Insumos (Arroz, Feijão), Água" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalhe do gasto ou ganho extra" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Valor (R$)</label>
            <input className="form-input" type="number" step="0.01" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Data de Competência</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
