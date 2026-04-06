'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, 
  FiArrowUpRight, 
  FiArrowDownLeft, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw,
  FiCalendar,
  FiTrendingUp,
  FiFileText
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getTransactions, 
  formatCurrency, 
  formatDateTime 
} from '@/lib/api';
import '@/app/admin/dashboard.css';

interface Transaction {
  id: string | number;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category?: string;
  created_at: string;
  order_id?: string | number;
}

export default function FinancialManagement() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
      addToast('Não foi possível carregar o fluxo de caixa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadTransactions();
    }
  }, [isAdmin]);

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.order_id && String(t.order_id).includes(searchTerm));
      
      return matchesType && matchesSearch;
    });
  }, [transactions, filterType, searchTerm]);

  if (loading && transactions.length === 0) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiDollarSign />
            Controle Financeiro
          </span>
          <h1>Fluxo de Caixa</h1>
          <p className="page-header__subtitle">
            Acompanhamento de receitas, despesas e lucratividade em tempo real.
          </p>
        </div>
        <div className="page-header__actions">
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={loadTransactions}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
            Atualizar
          </button>
          <button 
            className="btn btn--primary btn--sm"
            onClick={() => addToast('Exportação de balanço em desenvolvimento.', 'info')}
          >
            <FiFileText /> Gerar Balanço
          </button>
        </div>
      </div>

      <div className="grid grid--cols-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Total de Receitas</span>
              <span className="stat-card__value" style={{ color: 'var(--success-600)' }}>
                {formatCurrency(stats.income)}
              </span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--success-100)', color: 'var(--success-600)' }}>
              <FiArrowUpRight />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Total de Despesas</span>
              <span className="stat-card__value" style={{ color: 'var(--danger-600)' }}>
                {formatCurrency(stats.expense)}
              </span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--danger-100)', color: 'var(--danger-600)' }}>
              <FiArrowDownLeft />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-card__label">Saldo Líquido</span>
              <span className="stat-card__value" style={{ color: stats.balance >= 0 ? 'var(--primary-600)' : 'var(--danger-600)' }}>
                {formatCurrency(stats.balance)}
              </span>
            </div>
            <div className="stat-card__icon" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)' }}>
              <FiTrendingUp />
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="table-search">
            <FiSearch className="table-search__icon" />
            <input 
              type="text" 
              placeholder="Buscar por descrição ou ID do pedido..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FiFilter style={{ opacity: 0.5 }} />
            <div className="segmented-control">
              <button 
                className={`segmented-control__item ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                Todos
              </button>
              <button 
                className={`segmented-control__item ${filterType === 'income' ? 'active' : ''}`}
                onClick={() => setFilterType('income')}
              >
                Entradas
              </button>
              <button 
                className={`segmented-control__item ${filterType === 'expense' ? 'active' : ''}`}
                onClick={() => setFilterType('expense')}
              >
                Saídas
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiCalendar />
                        {formatDateTime(t.created_at)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.description}</div>
                      {t.order_id && (
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--primary-600)' }}>
                          Pedido #{t.order_id}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge--secondary">{t.category || 'Geral'}</span>
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: 800,
                      color: t.type === 'income' ? 'var(--success-600)' : 'var(--danger-600)'
                    }}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        color: t.type === 'income' ? 'var(--success-600)' : 'var(--danger-600)',
                        fontSize: '1.2rem'
                      }}>
                        {t.type === 'income' ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-empty">
                    Nenhuma movimentação financeira encontrada.
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
