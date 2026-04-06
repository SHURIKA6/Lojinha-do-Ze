'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiUsers, 
  FiSearch, 
  FiMail, 
  FiShield, 
  FiRefreshCw, 
  FiTrash2, 
  FiMoreVertical,
  FiUserCheck,
  FiUserX,
  FiKey
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { 
  getCustomers, 
  deleteCustomer, 
  resetCustomerPassword,
  formatDateTime 
} from '@/lib/api';
import { User } from '@/types';
import '@/app/admin/dashboard.css';

export default function CustomerManagement() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      addToast('Não foi possível carregar a base de clientes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadCustomers();
    }
  }, [isAdmin]);

  const handleResetPassword = async (id: string, name: string) => {
    if (!window.confirm(`Deseja resetar a senha de ${name}? Um e-mail será enviado.`)) return;

    try {
      setActionId(id);
      await resetCustomerPassword(id);
      addToast(`Redefinição de senha enviada para ${name}.`, 'success');
    } catch (err) {
      console.error('Erro ao resetar senha:', err);
      addToast('Erro ao processar redefinição.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`EXCLUSÃO CRÍTICA: Tem certeza que deseja remover ${name} do sistema?`)) return;

    try {
      setActionId(id);
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      addToast(`Cliente ${name} removido com sucesso.`, 'success');
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      addToast('Erro ao remover cliente.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        (c.phone || '').includes(searchTerm)
      );
    });
  }, [customers, searchTerm]);

  if (loading && customers.length === 0) {
    return (
      <div className="app-loader" style={{ minHeight: '50vh' }}>
        <div className="app-loader__spinner" />
        <p>Carregando diretório de clientes...</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiUsers />
            Relacionamento
          </span>
          <h1>Base de Clientes</h1>
          <p className="page-header__subtitle">
            Gerenciamento de contas, permissões e histórico de usuários.
          </p>
        </div>
        <div className="page-header__actions">
          <button 
            className="btn btn--secondary btn--sm" 
            onClick={loadCustomers}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 
            Sincronizar
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="table-search">
            <FiSearch className="table-search__icon" />
            <input 
              type="text" 
              placeholder="Buscar por Nome, E-mail ou Telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Contato</th>
                <th>Permissão</th>
                <th>Situação</th>
                <th>Cadastrado em</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ opacity: actionId === c.id ? 0.6 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          backgroundColor: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          {(c.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>ID: {c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-sm)' }}>
                        <FiMail style={{ color: 'var(--gray-400)' }} />
                        {c.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge--${c.role === 'admin' ? 'primary' : 'neutral'}`}>
                        <FiShield style={{ marginRight: '4px' }} />
                        {c.role === 'admin' ? 'Administrador' : 'Cliente'}
                      </span>
                    </td>
                    <td>
                      {c.is_active !== false ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-600)', fontSize: 'var(--font-sm)' }}>
                          <FiUserCheck /> Ativo
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger-600)', fontSize: 'var(--font-sm)' }}>
                          <FiUserX /> Inativo
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>
                      {formatDateTime(c.created_at || '')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        <button 
                          className="btn btn--sm btn--secondary" 
                          title="Resetar Senha"
                          onClick={() => handleResetPassword(c.id, c.name)}
                          disabled={!!actionId}
                        >
                          <FiKey />
                        </button>
                        <button 
                          className="btn btn--sm btn--danger" 
                          title="Excluir"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={!!actionId || c.role === 'admin'}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="table-empty">
                    Nenhum cliente encontrado.
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
