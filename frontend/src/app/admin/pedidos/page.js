'use client';

import { useState, useEffect } from 'react';
import { getOrders, updateOrderStatus, deleteOrder, formatCurrency, formatDateTime, getStatusLabel } from '@/lib/api';
import { FiPackage, FiCheck, FiTruck, FiTrash2, FiPhone, FiUser, FiSearch } from 'react-icons/fi';

const orderStatuses = ['novo', 'preparando', 'pronto', 'entregue'];
const statusLabels = { novo: 'Novo', preparando: 'Preparando', pronto: 'Pronto', entregue: 'Entregue' };
const statusColors = { novo: 'info', preparando: 'warning', pronto: 'success', entregue: 'primary' };

export default function PedidosPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { setOrders(await getOrders()); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await updateOrderStatus(id, status); loadData(); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este pedido?')) return;
    try { await deleteOrder(id); loadData(); } catch (err) { console.error(err); }
  };

  const filtered = orders.filter(o => {
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchSearch = !search || o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.customer_phone.includes(search);
    return matchStatus && matchSearch;
  });

  const newOrders = orders.filter(o => o.status === 'novo').length;

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Pedidos da Loja</h1>
          <p className="page-header__subtitle">{orders.length} pedidos {newOrders > 0 && `• ${newOrders} novos`}</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>Todos ({orders.length})</button>
        {orderStatuses.map(s => {
          const count = orders.filter(o => o.status === s).length;
          return <button key={s} className={`tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{statusLabels[s]} ({count})</button>;
        })}
      </div>

      <div className="filter-bar"><div className="table-search"><FiSearch className="table-search__icon" /><input placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {filtered.map(order => {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
          return (
            <div key={order.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Pedido #{order.id}</h3>
                    <span className={`badge badge--${statusColors[order.status] || 'neutral'}`}>{statusLabels[order.status] || order.status}</span>
                    {order.status === 'novo' && <span className="badge badge--danger" style={{ animation: 'pulse 2s infinite' }}>NOVO!</span>}
                  </div>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)' }}>{formatDateTime(order.created_at)}</p>
                </div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-xl)', color: 'var(--primary-600)' }}>{formatCurrency(order.total)}</div>
              </div>

              <div className="grid grid-2" style={{ marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FiUser style={{ color: 'var(--gray-400)' }} /><strong>{order.customer_name}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FiPhone style={{ color: 'var(--gray-400)' }} /><strong>{order.customer_phone}</strong></div>
              </div>

              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>ITENS DO PEDIDO</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', marginBottom: '2px' }}>
                    <span>{item.quantity}× {item.name}</span>
                    <strong>{formatCurrency(item.subtotal || item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              {order.notes && <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginBottom: 'var(--space-4)', padding: 'var(--space-2)', background: 'var(--warning-50)', borderRadius: 'var(--radius-sm)' }}>💬 {order.notes}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--gray-200)', paddingTop: 'var(--space-3)' }}>
                <select className="form-select" style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--font-sm)' }} value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}>
                  {orderStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
                <button className="btn btn--danger btn--sm" onClick={() => handleDelete(order.id)}><FiTrash2 /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-400)' }}><FiPackage style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }} /><p>Nenhum pedido encontrado</p></div>}
      </div>
    </div>
  );
}
