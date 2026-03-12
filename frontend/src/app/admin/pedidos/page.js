'use client';

import { useState, useEffect } from 'react';
import { getOrders, updateOrderStatus, deleteOrder, formatCurrency, formatDateTime } from '@/lib/api';
import { FiPackage, FiCheck, FiTruck, FiTrash2, FiPhone, FiUser, FiSearch, FiClock, FiMapPin, FiCreditCard } from 'react-icons/fi';

const orderStatuses = ['novo', 'recebido', 'em_preparo', 'saiu_entrega', 'concluido', 'cancelado'];
const statusLabels = { novo: 'Novo', recebido: 'Recebido', em_preparo: 'Em Preparo', saiu_entrega: 'Saiu p/ Entrega', concluido: 'Concluído', cancelado: 'Cancelado' };
const statusColors = { novo: 'info', recebido: 'neutral', em_preparo: 'warning', saiu_entrega: 'primary', concluido: 'success', cancelado: 'danger' };

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
    if (!confirm('Excluir este pedido? Esta ação não pode ser desfeita.')) return;
    try { await deleteOrder(id); loadData(); } catch (err) { console.error(err); }
  };

  const advanceStatus = (id, currentStatus, deliveryType) => {
    let next = 'concluido';
    if (currentStatus === 'novo' || currentStatus === 'recebido') next = 'em_preparo';
    else if (currentStatus === 'em_preparo') next = deliveryType === 'retirada' ? 'concluido' : 'saiu_entrega';
    else if (currentStatus === 'saiu_entrega') next = 'concluido';
    
    handleStatusChange(id, next);
  };

  const getActionLabel = (status, deliveryType) => {
    if (status === 'novo' || status === 'recebido') return 'Preparar Envio';
    if (status === 'em_preparo') return deliveryType === 'retirada' ? 'Finalizar Retirada' : 'Saiu para Entrega';
    if (status === 'saiu_entrega') return 'Confirmar Entrega / Concluir';
    return null;
  };

  const filtered = orders.filter(o => {
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchSearch = !search || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.customer_phone?.includes(search);
    return matchStatus && matchSearch;
  });

  const activeOrdersCount = orders.filter(o => ['novo', 'recebido', 'em_preparo', 'saiu_entrega'].includes(o.status)).length;

  if (loading) return <div className="animate-fadeIn" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando cozinha...</div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Pedidos e Logística</h1>
          <p className="page-header__subtitle">{orders.length} pedidos no total • {activeOrdersCount} pendentes agora</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>Todos ({orders.length})</button>
        {orderStatuses.map(s => {
          const count = orders.filter(o => o.status === s).length;
          return <button key={s} className={`tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{statusLabels[s]} ({count})</button>;
        })}
      </div>

      <div className="filter-bar"><div className="table-search"><FiSearch className="table-search__icon" /><input placeholder="Buscar nome do cliente ou número..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 'var(--space-4)' }}>
        {filtered.map(order => {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
          const actionLabel = getActionLabel(order.status, order.delivery_type);
          
          return (
            <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', gap: 'var(--space-2)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>#{order.id}</h3>
                    <span className={`badge badge--${statusColors[order.status] || 'neutral'}`}>{statusLabels[order.status] || order.status}</span>
                    {['novo', 'recebido'].includes(order.status) && <span className="badge badge--danger" style={{ animation: 'pulse 2s infinite' }}>!</span>}
                  </div>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '6px' }}><FiClock /> {formatDateTime(order.created_at)}</p>
                </div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)', color: 'var(--primary-600)', background: 'var(--primary-50)', padding: '4px 8px', borderRadius: '4px' }}>
                  {formatCurrency(order.total)}
                </div>
              </div>

              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', flex: 1 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', fontSize: 'var(--font-sm)', fontWeight: 600 }}><FiUser /> {order.customer_name || 'Anônimo'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}><FiPhone /> {order.customer_phone}</div>
                
                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>TIPO DE PEDIDO</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-sm)', fontWeight: 600, color: order.delivery_type === 'retirada' ? 'var(--info-600)' : 'var(--primary-600)' }}>
                    {order.delivery_type === 'retirada' ? <><FiPackage /> Retirada no Local</> : <><FiTruck /> Entrega Moto</>}
                  </div>
                  {order.delivery_type === 'entrega' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginTop: 'var(--space-2)' }}>
                      <FiMapPin style={{ flexShrink: 0, marginTop: '2px' }} /> <span style={{ lineHeight: 1.4 }}>{order.address}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--gray-600)', marginTop: 'var(--space-2)' }}>
                    <FiCreditCard /> Pagamento: {order.payment_method?.toUpperCase()}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>ITENS</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {items.map((item, i) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', marginBottom: '4px' }}>
                        <span><strong style={{ color: 'black' }}>{item.quantity}×</strong> {item.name}</span>
                      </li>
                    ))}
                  </ul>
                  {order.notes && <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gray-700)', marginTop: 'var(--space-3)', padding: 'var(--space-2)', background: '#fffbeb', borderLeft: '3px solid var(--warning-500)' }}>💬 {order.notes}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                <select className="form-select" style={{ width: '130px', padding: '6px 10px', fontSize: 'var(--font-sm)' }} value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}>
                  {orderStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
                
                {actionLabel ? (
                  <button className="btn btn--primary" style={{ padding: '6px 12px', flex: 1 }} onClick={() => advanceStatus(order.id, order.status, order.delivery_type)}>
                    {actionLabel}
                  </button>
                ) : (
                  <button className="btn btn--danger btn--sm" style={{ alignSelf: 'stretch' }} onClick={() => handleDelete(order.id)} title="Excluir"><FiTrash2 /></button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--gray-400)', background: 'white', borderRadius: 'var(--radius-lg)' }}><FiPackage style={{ fontSize: '3rem', margin: '0 auto var(--space-4)', opacity: 0.5 }} /><p style={{ fontSize: 'var(--font-lg)' }}>Nenhum pedido atende a este filtro.</p></div>}
      </div>
    </div>
  );
}
