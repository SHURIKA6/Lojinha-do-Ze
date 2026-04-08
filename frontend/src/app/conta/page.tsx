'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatCurrency,
  formatDate,
  getOrders,
  getStatusLabel,
  getStatusVariant,
} from '@/lib/api';
import { Order } from '@/types';
import { FiCheckCircle, FiClock, FiPackage, FiTruck } from 'react-icons/fi';

export default function ClienteDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    getOrders()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
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
    ['concluido', 'cancelado'].includes(order.status)
  );
  const pendingCount = validOrders.filter((order) => ['novo', 'recebido'].includes(order.status)).length;
  const preparingCount = validOrders.filter((order) => order.status === 'em_preparo').length;
  const deliveringCount = validOrders.filter((order) => order.status === 'saiu_entrega').length;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiPackage />
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
            <FiClock />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Na fila</div>
            <div className="metric-card__value">{pendingCount}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiPackage />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Em preparo</div>
            <div className="metric-card__value">{preparingCount}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--primary-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiTruck />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">A caminho</div>
            <div className="metric-card__value">{deliveringCount}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiCheckCircle />
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

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Itens</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>

            <tbody>
              {validOrders.length > 0 ? (
                validOrders.map((order) => {
                  let itemsLabel = '';

                  try {
                    const items = Array.isArray(order.items) ? order.items : [];
                    itemsLabel = items.map((item) => `${item.quantity}x ${item.productName || (item as any).name}`).join(', ');
                  } catch (error) {
                    console.error(error);
                  }

                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>
                        <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-xs)' }}>
                          {order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega'}
                        </div>
                      </td>
                      <td>{itemsLabel || 'Itens indisponíveis'}</td>
                      <td>
                        {order.payment_method === 'pix'
                          ? 'PIX'
                          : order.payment_method === 'maquininha'
                            ? 'Maquininha'
                            : order.payment_method}
                      </td>
                      <td style={{ fontWeight: 800 }}>{formatCurrency(order.total)}</td>
                      <td>
                        <span className={`badge badge--${getStatusVariant(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="table-empty">
                    Você ainda não fez nenhum pedido.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
