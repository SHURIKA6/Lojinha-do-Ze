'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getDemandForecast, getReviewSentiment, formatCurrency } from '@/lib/api';
import { 
  FiRefreshCw, FiTrendingUp, FiTarget, FiAlertCircle, FiSmile, FiMeh, FiFrown
} from 'react-icons/fi';
import dynamic from 'next/dynamic';
import '@/app/admin/dashboard.css';

// Code Splitting para os gráficos de previsão
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

interface Forecast {
  id: string | number;
  name: string;
  currentStock: number;
  movingAverage: number;
  regression: number;
  seasonality: boolean;
}

interface Sentiment {
  sentiment: 'positive' | 'neutral' | 'negative';
  text: string;
  score: number;
}

export default function InteractiveDashboard() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [sentiments, setSentiments] = useState<Sentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAdvancedData() {
    try {
      setLoading(true);
      const [forecastRes, sentimentRes] = await Promise.all([
        getDemandForecast(),
        getReviewSentiment()
      ]);
      
      setForecasts(forecastRes.forecasts || []);
      setSentiments(sentimentRes.sentimentAnalysis || []);
    } catch (err) {
      console.error('Erro ao carregar dados analíticos:', err);
      addToast('Não foi possível carregar as previsões baseadas em IA.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdvancedData();
    }
  }, [isAdmin]);

  const handleRefresh =() => {
    setRefreshing(true);
    loadAdvancedData();
  };

  if (loading && !refreshing) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-dashboard-loading__title"></div>
        <div className="admin-dashboard-loading__metrics">
          {[1, 2, 3].map((i) => <div key={i} className="admin-dashboard-loading__metric"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div className="admin-dashboard__header-info">
          <h1 className="admin-dashboard__title">Inteligência Competitiva (BI)</h1>
          <p className="admin-dashboard__subtitle">
            Insights automáticos e previsão de demanda gerados via Inteligência Artificial.
          </p>
        </div>
        <div className="admin-dashboard__header-actions">
          <button 
            className="admin-dashboard__refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Atualizando...' : 'Recalcular'}
          </button>
        </div>
      </header>

      {/* Previsões de Estoque */}
      <div className="dashboard-card">
        <div className="dashboard-card__header">
          <h3 className="dashboard-card__title">
            <FiTrendingUp className="dashboard-card__title-icon" style={{ color: 'var(--primary-500)' }} />
            Previsão de Demanda de Estoque (Próx 7 dias)
          </h3>
        </div>
        <div className="dashboard-card__body--padded">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque Atual</th>
                  <th>Previsão (Média Móvel)</th>
                  <th>Tendência Lin.</th>
                  <th>Sazonalidade Detectada</th>
                  <th>Recomendação</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(forecasts) ? forecasts : []).map((f: Forecast) => {
                  const toBuy = f.regression > f.currentStock;
                  return (
                    <tr key={f.id}>
                      <td>{f.name}</td>
                      <td>{f.currentStock} und</td>
                      <td>{Math.round(f.movingAverage)} und</td>
                      <td>{f.regression.toFixed(2)} und</td>
                      <td>{f.seasonality ? <span className="badge badge--warning">Alta Sazonalidade</span> : <span className="badge badge--neutral">Estável</span>}</td>
                      <td>
                        {toBuy ? (
                          <span className="badge badge--danger"><FiAlertCircle style={{marginRight: '4px'}}/>Repôr Estoque</span>
                        ) : (
                          <span className="badge badge--success">Estoque Saudável</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {forecasts.length === 0 && (
                  <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>Nenhum dado preditivo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

       {/* Análise de Sentimento das Avaliações Recentes */}
       <div className="dashboard-card mt-8">
        <div className="dashboard-card__header">
          <h3 className="dashboard-card__title">
            <FiTarget className="dashboard-card__title-icon" style={{ color: 'var(--success-500)' }} />
            Termômetro de Satisfação (Análise de Sentimento PLN)
          </h3>
        </div>
        <div className="dashboard-card__body--padded">
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {(Array.isArray(sentiments) ? sentiments : []).map((s: Sentiment, idx: number) => (
                <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--gray-200)', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                        {s.sentiment === 'positive' && <FiSmile size={24} color="var(--success-500)" />}
                        {s.sentiment === 'neutral' && <FiMeh size={24} color="var(--warning-500)" />}
                        {s.sentiment === 'negative' && <FiFrown size={24} color="var(--danger-500)" />}
                        <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>Sentimento {s.sentiment}</span>
                    </div>
                    <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', fontStyle: 'italic' }}>"{s.text}"</p>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                       <span>Score (Polaridade):</span>
                       <span style={{ fontWeight: '600', color: s.score > 0 ? 'var(--success-500)' : s.score < 0 ? 'var(--danger-500)' : 'var(--warning-500)' }}>{s.score.toFixed(2)}</span>
                    </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}