'use client';

import React, { useEffect, useState } from 'react';
import { FiGift, FiPlus, FiMinus, FiClock, FiStar, FiShoppingBag, FiInfo } from 'react-icons/fi';
import { getLoyaltyBalance, LoyaltyData } from '@/core/api/profile';
import { formatCurrency, formatDate } from '@/core/api';

export default function FidelidadePage() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoyaltyBalance()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando seus pontos...</p>
      </div>
    );
  }

  const balance = data?.balance || 0;
  const cashbackValue = balance * 0.05;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiGift />
            Programa de Fidelidade
          </span>
          <h1>Meus Pontos</h1>
          <p className="page-header__subtitle">
            Acumule pontos em suas compras e troque por descontos exclusivos.
          </p>
        </div>
      </div>

      <div className="status-summary" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="metric-card" style={{ '--metric-color': 'var(--gold-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiStar />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Saldo atual</div>
            <div className="metric-card__value">{balance} pts</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--success-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiGift />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Equivale a</div>
            <div className="metric-card__value">{formatCurrency(cashbackValue)}</div>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-color': 'var(--info-500)' } as React.CSSProperties}>
          <div className="metric-card__icon">
            <FiInfo />
          </div>
          <div className="metric-card__content">
            <div className="metric-card__label">Regra de ganho</div>
            <div className="metric-card__value">1 pt = R$ 1,00</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="surface" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
          <div className="table-header" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 className="table-header__title">
              <FiClock style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Histórico de Pontos
            </h3>
          </div>

          {data?.history && data.history.length > 0 ? (
            <div className="loyalty-history-list" style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {data.history.map((tx, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: tx.type === 'earn' ? 'var(--success-100)' : 'var(--danger-100)',
                      color: tx.type === 'earn' ? 'var(--success-600)' : 'var(--danger-600)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                    }}>
                      {tx.type === 'earn' ? <FiPlus /> : <FiMinus />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{tx.description}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{formatDate(tx.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: 800, 
                    fontSize: '1.1rem',
                    color: tx.type === 'earn' ? 'var(--success-600)' : 'var(--danger-600)'
                  }}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
              <FiGift size={48} style={{ opacity: 0.2, marginBottom: 'var(--space-4)' }} />
              <p>Você ainda não possui transações de pontos.</p>
            </div>
          )}
        </div>

        <div className="surface" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', height: 'fit-content' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.25rem' }}>Como funciona?</h3>
          <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ color: 'var(--primary-600)', flexShrink: 0 }}><FiStar /></div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Ganhe Pontos</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', margin: 0 }}>
                  A cada R$ 1,00 gastos em produtos, você ganha 1 ponto de fidelidade.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ color: 'var(--primary-600)', flexShrink: 0 }}><FiGift /></div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Troque por Descontos</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', margin: 0 }}>
                  Cada ponto vale R$ 0,05 de desconto real no seu carrinho.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div style={{ color: 'var(--primary-600)', flexShrink: 0 }}><FiShoppingBag /></div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Use no Checkout</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', margin: 0 }}>
                  No momento do pagamento, escolha quantos pontos deseja resgatar.
                </p>
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: 'var(--space-8)', 
            padding: 'var(--space-5)', 
            background: 'var(--primary-600)', 
            borderRadius: 'var(--radius-md)',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Seu saldo atual vale</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {formatCurrency(cashbackValue)}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.5rem' }}>de desconto na sua próxima compra!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
