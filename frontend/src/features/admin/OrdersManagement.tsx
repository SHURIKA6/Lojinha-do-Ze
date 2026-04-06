'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiShoppingBag, 
  FiSearch, 
  FiFilter, 
  FiEye, 
  FiCheckCircle, 
  FiTruck, 
  FiPackage, 
  FiXCircle,
  FiRefreshCw,
  FiMoreVertical,
  FiTrash2
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getOrders, 
  updateOrderStatus, 
  deleteOrder, 
  formatCurrency, 
  formatDateTime, 
  getStatusLabel, 
  getStatusVariant,
  getPaymentMethodLabel
} from '@/lib/api';
import { Order, OrderStatus } from '@/types';
import '@/app/admin/dashboard.css'; // Reusing dashboard styles for consistency

export default function OrdersManagement() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      addToast('Não foi possível carregar a lista de pedidos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
    }
  }, [isAdmin]);

  const handleStatusUpdate = async (id: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(id);
      await updateOrderStatus(id, newStatus);
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === id ? { ...order, status: newStatus } : order
      ));
      
      addToast(`Pedido #${id} atualizado para ${getStatusLabel(newStatus)}.`, 'success');
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      addToast('Falha ao atualizar o status do pedido.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o pedido #${id}?`)) return;

    try {
      setUpdatingId(id);
      await deleteOrder(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      addToast('Pedido excluído com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      addToast('Erro ao excluir o pedido.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        order.id.toString().includes(searchTerm) || 
        (order.customer_name || '').toLowerCase().includes(searchLower);
      
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchTerm]);

  if (loading && orders.length === 0) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando gerenciador de pedidos...</p>
      </div>
    );
  }

  return (
    <div className="fade-in surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiShoppingBag />
            Operação
          </span>
          <h1 style={{ color: 'white', marginTop: '0.5rem' }}>Gerenciamento de Pedidos</h1>
          <p className="page-header__subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Visualize, filtre e gerencie o status de todos os pedidos da loja.
          </p>
        </div>
        <div className="page-header__actions">
          <button 
            className="btn-admin" 
            onClick={loadOrders}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
            Atualizar
          </button>
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input 
              type="text" 
              placeholder="Buscar por ID ou Nome do Cliente..." 
              className="admin-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FiFilter style={{ opacity: 0.5 }} />
            <select 
              className="admin-input" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="all">Todos os Status</option>
              <option value="novo">Novo</option>
              <option value="recebido">Recebido</option>
              <option value="em_preparo">Em Preparo</option>
              <option value="saiu_entrega">Saiu para Entrega</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Data/Hora</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} style={{ opacity: updatingId === order.id ? 0.6 : 1 }}>
                  <td><strong>#{order.id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{order.customer_name || 'Cliente Avulso'}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      {order.delivery_type === 'retirada' ? 'Retirada na Loja' : 'Entrega em Domicílio'}
                    </div>
                  </td>
                  <td>{formatDateTime(order.created_at)}</td>
                  <td>{getPaymentMethodLabel(order.payment_method || '')}</td>
                  <td style={{ fontWeight: 800 }}>{formatCurrency(order.total)}</td>
                  <td>
                    <span className={`badge badge--${getStatusVariant(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {order.status === 'novo' && (
                        <button 
                          className="btn-admin" 
                          style={{ padding: '0.4rem', background: '#48bb78' }}
                          title="Mover para Preparo"
                          onClick={() => handleStatusUpdate(order.id, 'em_preparo')}
                          disabled={!!updatingId}
                        >
                          <FiPackage />
                        </button>
                      )}
                      {order.status === 'em_preparo' && (
                        <button 
                          className="btn-admin" 
                          style={{ padding: '0.4rem', background: '#ecc94b' }}
                          title="Mover para Entrega"
                          onClick={() => handleStatusUpdate(order.id, 'saiu_entrega')}
                          disabled={!!updatingId}
                        >
                          <FiTruck />
                        </button>
                      )}
                      {order.status === 'saiu_entrega' && (
                        <button 
                          className="btn-admin" 
                          style={{ padding: '0.4rem', background: '#38a169' }}
                          title="Concluir Pedido"
                          onClick={() => handleStatusUpdate(order.id, 'concluido')}
                          disabled={!!updatingId}
                        >
                          <FiCheckCircle />
                        </button>
                      )}
                      <button 
                        className="btn-admin" 
                        style={{ padding: '0.4rem', background: '#a0aec0' }}
                        title="Detalhes"
                        onClick={() => addToast('Visualização de detalhes em desenvolvimento.', 'info')}
                      >
                        <FiEye />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Nenhum pedido encontrado para os filtros aplicados.' 
                    : 'Nenhum pedido registrado no sistema.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
