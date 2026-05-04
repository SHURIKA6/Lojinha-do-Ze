'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useConfirm } from '@/components/ui/ConfirmDialogProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  formatCurrency,
  formatDateTime,
  formatAddress
} from '@/core/api';
import { getOrders, updateOrderStatus, deleteOrder } from '@/core/api/orders';
import {
  Clock,
  CreditCard,
  MapPin,
  Package,
  Phone,
  Search,
  Trash2,
  Truck,
  User,
  Map
} from 'lucide-react';
import { Order } from '@/types';

const orderStatuses = ['novo', 'recebido', 'em_preparo', 'saiu_entrega', 'concluido', 'cancelado'];

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  novo: 'info',
  recebido: 'neutral',
  em_preparo: 'warning',
  saiu_entrega: 'primary',
  concluido: 'success',
  cancelado: 'danger',
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingCodes, setTrackingCodes] = useState<Record<string, string>>({});
  const [sharingLocation, setSharingLocation] = useState<Record<string, number | null>>({});
  const watchIds = useRef<Record<string, number>>({});
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getOrders();
      const data = Array.isArray(res) ? res : (res?.data || []);
      setOrders(data);
      const initialTracking: Record<string, string> = {};
      data.forEach(order => {
        if (order.tracking_code) {
          initialTracking[order.id] = order.tracking_code;
        }
      });
      setTrackingCodes(initialTracking);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number | string, status: string, trackingCode?: string) => {
    try {
      await updateOrderStatus(String(id), { status: status as any, notes: trackingCode });
      toast.success('Status do pedido atualizado.');
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Não foi possível atualizar o pedido.');
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      title: 'Excluir pedido',
      description: 'Esta ação não pode ser desfeita.',
      body: 'Deseja realmente excluir este pedido?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteOrder(String(id));
      toast.success('Pedido excluído com sucesso.');
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Não foi possível excluir o pedido.');
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = !statusFilter || order.status === statusFilter;
      const matchSearch =
        !search ||
        order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.customer_phone?.includes(search);

      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const activeOrdersCount = orders.filter((order) =>
    ['novo', 'recebido', 'em_preparo', 'saiu_entrega'].includes(order.status || '')
  ).length;

  const advanceStatus = (id: number | string, currentStatus: string, deliveryType: string) => {
    let next = 'concluido';

    if (currentStatus === 'novo' || currentStatus === 'recebido') {
      next = 'em_preparo';
    } else if (currentStatus === 'em_preparo') {
      next = deliveryType === 'pickup' ? 'concluido' : 'saiu_entrega';
    } else if (currentStatus === 'saiu_entrega') {
      next = 'concluido';
    }

    handleStatusChange(id, next, trackingCodes[String(id)]);
  };

  const updateTrackingCode = (id: string, code: string) => {
    setTrackingCodes(prev => ({ ...prev, [id]: code }));
  };

  const toggleLocationSharing = async (id: string) => {
    if (sharingLocation[id]) {
      // Stop sharing
      if (watchIds.current[id]) {
        navigator.geolocation.clearWatch(watchIds.current[id]);
        delete watchIds.current[id];
      }
      setSharingLocation(prev => ({ ...prev, [id]: null }));
      toast.info('Compartilhamento de localização pausado.');
      return;
    }

    // Start sharing
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador.');
      return;
    }

    try {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            await fetch(`/api/delivery/${id}/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
            });
          } catch (err) {
            console.error('Erro ao atualizar localização:', err);
          }
        },
        (err) => {
          console.error('Erro de geolocalização:', err);
          toast.error('Erro ao obter localização.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      watchIds.current[id] = watchId;
      setSharingLocation(prev => ({ ...prev, [id]: watchId }));
      toast.success('Compartilhando localização com o cliente!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar compartilhamento.');
    }
  };

  const getActionLabel = (status: string, deliveryType: string) => {
    if (status === 'novo' || status === 'recebido') {
      return 'Marcar em preparo';
    }

    if (status === 'em_preparo') {
      return deliveryType === 'pickup' ? 'Finalizar retirada' : 'Saiu para entrega';
    }

    if (status === 'saiu_entrega') {
      return 'Concluir pedido';
    }

    return null;
  };

  if (loading) {
    return (
      <div className="app-loader" style={{ minHeight: '60vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <Package />
            Logística
          </span>
          <h1>Pedidos</h1>
          <p className="page-header__subtitle">
            {orders.length} pedidos no total, {activeOrdersCount} em andamento agora.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>
          Todos ({orders.length})
        </button>
        {orderStatuses.map((status) => {
          const count = orders.filter((order) => order.status === status).length;

          return (
            <button
              key={status}
              className={`tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {statusLabels[status]} ({count})
            </button>
          );
        })}
      </div>

      <div className="filter-bar">
        <div className="table-search">
          <Search className="table-search__icon" />
          <input
            placeholder="Buscar por cliente ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="ops-order-grid">
        {filtered.map((order) => {
          let items: any[] = [];

          try {
            items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
          } catch (error) {
            console.error(error);
          }

          const actionLabel = getActionLabel(order.status || '', order.delivery_type || '');

          return (
            <article key={order.id} className="ops-order-card">
              <div className="ops-order-card__head">
                <div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <h3>#{order.id}</h3>
                    <span className={`badge badge--${statusColors[order.status || ''] || 'neutral'}`}>
                      {statusLabels[order.status || ''] || order.status}
                    </span>
                  </div>
                  <div className="ops-order-card__line">
                    <Clock />
                    {formatDateTime(order.created_at || '')}
                  </div>
                </div>

                <div className="ops-order-card__amount">{formatCurrency(Number(order.total))}</div>
              </div>

              <div className="ops-order-card__body">
                <div>
                  <div className="ops-order-card__label">Cliente</div>
                  <div className="ops-order-card__line">
                    <User />
                    {order.customer_name || 'Cliente avulso'}
                  </div>
                  <div className="ops-order-card__line">
                    <Phone />
                    {order.customer_phone || 'Sem telefone'}
                  </div>
                </div>

                <div>
                  <div className="ops-order-card__label">Entrega e pagamento</div>
                  <div className="ops-order-card__line">
                    {order.delivery_type === 'pickup' ? <Package /> : <Truck />}
                    {order.delivery_type === 'pickup' ? 'Retirada no local' : 'Entrega local'}
                  </div>
                  {order.delivery_type === 'delivery' && order.address && (
                    <div className="ops-order-card__line">
                      <MapPin />
                      {formatAddress(order.address)}
                    </div>
                  )}
                  <div className="ops-order-card__line">
                    <CreditCard />
                    Pagamento: {order.payment_method?.toUpperCase() || 'Não informado'}
                  </div>
                </div>

                <div>
                  <div className="ops-order-card__label">Itens</div>
                  <div className="ops-order-card__list">
                    {items.map((item, index) => (
                      <div key={`${order.id}-${index}`} className="ops-order-card__item">
                        <span>
                          <strong>{item.quantity}x</strong> {item.name}
                        </span>
                        <span>{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                 {order.notes && <div className="ops-order-card__note">{order.notes}</div>}
               </div>
                 <div className="ops-order-card__footer" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                   <select
                     className="form-select"
                     value={order.status}
                     onChange={(e) => handleStatusChange(order.id, e.target.value, trackingCodes[String(order.id)])}
                   >
                     {orderStatuses.map((status) => (
                       <option key={status} value={status}>
                         {statusLabels[status]}
                       </option>
                     ))}
                   </select>

                   {order.status === 'saiu_entrega' && (
                     <button 
                       className={`btn ${sharingLocation[String(order.id)] ? 'btn--danger' : 'btn--neutral'}`}
                       onClick={() => toggleLocationSharing(String(order.id))}
                       style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}
                     >
                       <Map />
                       {sharingLocation[String(order.id)] ? 'Parar Localização' : 'Compartilhar Local'}
                     </button>
                   )}

                   {actionLabel ? (
                     <button
                       className="btn btn--primary"
                       onClick={() => advanceStatus(order.id, order.status || '', order.delivery_type || '')}
                     >
                       {actionLabel}
                     </button>
                   ) : (
                     <button className="btn btn--danger" onClick={() => handleDelete(order.id)}>
                       <Trash2 />
                       Excluir
                     </button>
                   )}
                 </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state__icon">
              <Package />
            </div>
            <p>Nenhum pedido atende ao filtro atual.</p>
          </div>
        )}
      </div>
    </div>
  );
}
