'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/core/contexts/AuthContext';
import {
  formatCurrency,
  formatDate,
  getOrders,
  getStatusLabel,
  getStatusVariant,
} from '@/core/api';
import { CheckCircle, Clock, Package, Truck, Map } from 'lucide-react';
import { Order } from '@/types';
import DeliveryMap from '@/components/delivery/DeliveryMap';

export default function ClienteDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    getOrders()
      .then((data: any) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando seus pedidos...</p>
      </div>
    );
  }

  const validOrders = Array.isArray(orders) ? orders : [];
  const completedOrders = validOrders.filter((order) =>
    ['concluido', 'cancelado'].includes(order.status || '')
  );
  const pendingCount = validOrders.filter((order) => ['novo', 'recebido'].includes(order.status || '')).length;
  const preparingCount = validOrders.filter((order) => order.status === 'em_preparo').length;
  const deliveringCount = validOrders.filter((order) => order.status === 'saiu_entrega').length;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <Package />
            Minha conta
          </span>
          <h1>Meus pedidos</h1>
          <p className="page-header__subtitle">
            Acompanhe status, histórico e pagamentos em uma leitura mais clara.
          </p>
        </div>
      </div>

      <div className="status-summary">
        <div className="metric-card" style={{ '--metric-color': 'var(--warning-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <Clock />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Na fila</div>
            <div className="metric-card__value">{pendingCount}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <Package />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Em preparo</div>
            <div className="metric-card__value">{preparingCount}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--primary-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <Truck />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">A caminho</div>
            <div className="metric-card__value">{deliveringCount}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <CheckCircle />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Concluídos</div>
            <div className="metric-card__value">{completedOrders.length}</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3 className="table-header__title">Histórico de pedidos</h3>
        </div>

        <div className="orders-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
          {validOrders.length > 0 ? (
            validOrders.map((order) => {
              let itemsLabel = '';

              try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
                itemsLabel = (Array.isArray(items) ? items : []).map((item: any) => `${item.quantity}x`).join(', ');
              } catch (error) {
                console.error(error);
              }

              const steps = [
                { id: 'novo', label: 'Pedido' },
                { id: 'recebido', label: 'Confirmado' },
                { id: 'em_preparo', label: 'Preparando' },
                { id: 'saiu_entrega', label: order.delivery_type === 'retirada' ? 'Aguardando Retirada' : 'Enviado' },
                { id: 'concluido', label: 'Concluído' }
              ];

              let currentStepIndex = steps.findIndex(s => s.id === order.status);
              if (order.status === 'cancelado') currentStepIndex = -1;

              return (
                <div key={order.id} className="surface" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Pedido #{order.id}</h4>
                      <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        {formatDate(order.created_at || '')} • {order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatCurrency(Number(order.total))}</div>
                      <span className={`badge badge--${getStatusVariant(order.status || '')}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                        {getStatusLabel(order.status || '')}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: 'var(--gray-700)' }}>
                    <strong>Itens:</strong> {itemsLabel || 'Itens indisponíveis'}
                  </div>

                  {order.status !== 'cancelado' ? (
                    <div className="order-timeline" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '10%', right: '10%', height: '2px', background: 'var(--gray-200)', zIndex: 0 }} />
                      
                      {currentStepIndex > 0 && (
                        <div style={{ 
                          position: 'absolute', top: '12px', left: '10%', 
                          width: `${(currentStepIndex / (steps.length - 1)) * 80}%`, 
                          height: '2px', background: 'var(--primary-500)', zIndex: 1,
                          transition: 'width 0.3s ease'
                        }} />
                      )}

                      {steps.map((step, index) => {
                        const isCompleted = currentStepIndex >= index;
                        const isCurrent = currentStepIndex === index;
                        
                        return (
                          <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '20%' }}>
                            <div style={{ 
                              width: '24px', height: '24px', borderRadius: '50%', 
                              background: isCompleted ? 'var(--primary-500)' : 'var(--gray-200)',
                              border: isCurrent ? '4px solid var(--primary-100)' : '2px solid white',
                              boxShadow: '0 0 0 1px var(--gray-200)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '12px'
                            }}>
                              {isCompleted && <CheckCircle size={14} />}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: isCurrent ? 600 : 400, color: isCompleted ? 'var(--gray-900)' : 'var(--gray-500)', textAlign: 'center' }}>
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', background: 'var(--danger-50)', color: 'var(--danger-600)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                      Este pedido foi cancelado.
                    </div>
                  )}

                  {order.status === 'saiu_entrega' && order.delivery_type === 'entrega' && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                      <button 
                        className="btn btn--outline"
                        onClick={() => setTrackingOrderId(trackingOrderId === String(order.id) ? null : String(order.id))}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                      >
                        <Map size={18} />
                        {trackingOrderId === String(order.id) ? 'Fechar Mapa' : 'Localizar Entregador'}
                      </button>
                      {trackingOrderId === String(order.id) && (
                        <div style={{ marginTop: '1rem' }}>
                          <DeliveryMap orderId={String(order.id)} />
                        </div>
                      )}
                    </div>
                  )}

                  {order.tracking_code && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Truck style={{ color: 'var(--primary-500)' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Código de Rastreio</div>
                        <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>{order.tracking_code}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">
                <Package />
              </div>
              <p>Você ainda não fez nenhum pedido.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
