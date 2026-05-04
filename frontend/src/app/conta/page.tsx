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
import './account.css';

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
    ['entregue', 'cancelado'].includes(order.status || '')
  );
  const pendingCount = validOrders.filter((order) => ['pendente'].includes(order.status || '')).length;
  const preparingCount = validOrders.filter((order) => order.status === 'processando').length;
  const deliveringCount = validOrders.filter((order) => order.status === 'enviado').length;

  return (
    <main className="animate-fadeIn" aria-labelledby="page-title">
      <div className="page-header">
        <div>
          <span className="page-eyebrow" aria-hidden="true">
            <Package size={16} />
            Minha conta
          </span>
          <h1 id="page-title">Meus pedidos</h1>
          <p className="page-header__subtitle">
            Acompanhe status, histórico e pagamentos em uma leitura mais clara.
          </p>
        </div>
      </div>

      <section className="status-summary" aria-label="Resumo de status dos pedidos">
        <div 
          className="metric-card" 
          style={{ '--metric-color': 'var(--warning-500)' } as React.CSSProperties}
          role="status"
          aria-labelledby="pending-label"
        >
          <div className="metric-card__icon" aria-hidden="true">
            <Clock />
          </div>
          <div className="metric-card__content">
            <div id="pending-label" className="metric-card__label">Na fila</div>
            <div className="metric-card__value">{pendingCount}</div>
          </div>
        </div>

        <div 
          className="metric-card" 
          style={{ '--metric-color': 'var(--info-500)' } as React.CSSProperties}
          role="status"
          aria-labelledby="preparing-label"
        >
          <div className="metric-card__icon" aria-hidden="true">
            <Package />
          </div>
          <div className="metric-card__content">
            <div id="preparing-label" className="metric-card__label">Em preparo</div>
            <div className="metric-card__value">{preparingCount}</div>
          </div>
        </div>

        <div 
          className="metric-card" 
          style={{ '--metric-color': 'var(--primary-500)' } as React.CSSProperties}
          role="status"
          aria-labelledby="shipping-label"
        >
          <div className="metric-card__icon" aria-hidden="true">
            <Truck />
          </div>
          <div className="metric-card__content">
            <div id="shipping-label" className="metric-card__label">A caminho</div>
            <div className="metric-card__value">{deliveringCount}</div>
          </div>
        </div>

        <div 
          className="metric-card" 
          style={{ '--metric-color': 'var(--success-500)' } as React.CSSProperties}
          role="status"
          aria-labelledby="completed-label"
        >
          <div className="metric-card__icon" aria-hidden="true">
            <CheckCircle />
          </div>
          <div className="metric-card__content">
            <div id="completed-label" className="metric-card__label">Concluídos</div>
            <div className="metric-card__value">{completedOrders.length}</div>
          </div>
        </div>
      </section>

      <section className="table-container" aria-labelledby="history-title">
        <div className="table-header">
          <h2 id="history-title" className="table-header__title">Histórico de pedidos</h2>
        </div>

        <div className="orders-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
          {validOrders.length > 0 ? (
            validOrders.map((order) => {
              let itemsLabel = '';

              try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
                itemsLabel = (Array.isArray(items) ? items : []).map((item: any) => `${item.quantity}x ${item.name || ''}`).join(', ');
              } catch (error) {
                console.error(error);
              }

              const steps = [
                { id: 'pendente', label: 'Pedido' },
                { id: 'processando', label: 'Preparando' },
                { id: 'enviado', label: order.delivery_type === 'retirada' ? 'Aguardando Retirada' : 'Enviado' },
                { id: 'entregue', label: 'Concluído' }
              ];

              let currentStepIndex = steps.findIndex(s => s.id === order.status);
              if (order.status === 'cancelado') currentStepIndex = -1;

              return (
                <article 
                  key={order.id} 
                  className="surface order-item-card" 
                  aria-labelledby={`order-heading-${order.id}`}
                >
                  <div className="order-item-header">
                    <div>
                      <h3 id={`order-heading-${order.id}`}>Pedido #{order.id}</h3>
                      <div className="order-item-meta">
                        <time dateTime={order.created_at}>{formatDate(order.created_at || '')}</time>
                        <span className="separator"> • </span>
                        <span>{order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega'}</span>
                      </div>
                    </div>
                    <div className="order-item-total">
                      <div className="price">{formatCurrency(Number(order.total))}</div>
                      <span 
                        className={`badge badge--${getStatusVariant(order.status || '')}`}
                        role="status"
                      >
                        {getStatusLabel(order.status || '')}
                      </span>
                    </div>
                  </div>

                  <div className="order-item-details">
                    <strong>Itens:</strong> {itemsLabel || 'Itens indisponíveis'}
                  </div>

                  {order.status !== 'cancelado' ? (
                    <div 
                      className="order-timeline" 
                      role="progressbar" 
                      aria-valuemin={0} 
                      aria-valuemax={steps.length - 1} 
                      aria-valuenow={currentStepIndex}
                      aria-valuetext={`Status atual: ${getStatusLabel(order.status || '')}`}
                    >
                      <div className="timeline-track" aria-hidden="true" />
                      
                      {currentStepIndex > 0 && (
                        <div 
                          className="timeline-progress"
                          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                          aria-hidden="true"
                        />
                      )}

                      {steps.map((step, index) => {
                        const isCompleted = currentStepIndex >= index;
                        const isCurrent = currentStepIndex === index;
                        
                        return (
                          <div 
                            key={step.id} 
                            className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                            aria-current={isCurrent ? 'step' : undefined}
                          >
                            <div className="step-indicator">
                              {isCompleted && <CheckCircle size={14} aria-hidden="true" />}
                            </div>
                            <div className="step-label">
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="cancel-notice" role="alert">
                      Este pedido foi cancelado.
                    </div>
                  )}

                  {order.status === 'enviado' && order.delivery_type === 'entrega' && (
                    <div className="delivery-tracking">
                      <button 
                        className="btn btn--outline"
                        onClick={() => setTrackingOrderId(trackingOrderId === String(order.id) ? null : String(order.id))}
                        aria-expanded={trackingOrderId === String(order.id)}
                        aria-controls={`map-${order.id}`}
                      >
                        <Map size={18} aria-hidden="true" />
                        {trackingOrderId === String(order.id) ? 'Fechar Mapa' : 'Localizar Entregador'}
                      </button>
                      {trackingOrderId === String(order.id) && (
                        <div id={`map-${order.id}`} className="map-container animate-slideDown">
                          <DeliveryMap orderId={String(order.id)} />
                        </div>
                      )}
                    </div>
                  )}

                  {order.tracking_code && (
                    <div className="tracking-code-banner">
                      <Truck className="icon" aria-hidden="true" />
                      <div>
                        <div className="label">Código de Rastreio</div>
                        <div className="code">{order.tracking_code}</div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <div className="empty-state" role="status">
              <div className="empty-state__icon" aria-hidden="true">
                <Package />
              </div>
              <p>Você ainda não fez nenhum pedido.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

