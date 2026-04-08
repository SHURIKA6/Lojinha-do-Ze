import React from 'react';
import {
  FiUsers,
  FiSearch,
  FiMail,
  FiShield,
  FiRefreshCw,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiKey,
  FiEdit,
  FiXCircle,
  FiSave
} from 'react-icons/fi';
import { getRoleLabel } from '@/lib/roles';
import { CustomerRecord } from '@/types';
import { formatDateTime } from '@/lib/api';

interface CustomerManagementViewProps {
  currentUserId: string;
  customers: CustomerRecord[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  actionId: string | null;
  editingId: string | null;
  editForm: {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  };
  setEditForm: (form: any) => void;
  loadCustomers: () => Promise<void>;
  handleStartEdit: (customer: CustomerRecord) => void;
  handleCancelEdit: () => void;
  handleSaveEdit: (id: string | number) => Promise<void>;
  handleResetPassword: (id: string, name: string) => Promise<void>;
  handleUpdateRole: (id: string | number, name: string, newRole: any) => Promise<void>;
  handleDelete: (id: string, name: string) => Promise<void>;
  filteredCustomers: CustomerRecord[];
  canEditRecord: (customer: CustomerRecord) => boolean;
  canResetPasswordFor: (customer: CustomerRecord) => boolean;
  canDeleteRecord: (customer: CustomerRecord) => boolean;
  isAdmin: boolean;
  isShura: boolean;
}

export default function CustomerManagementView({
  currentUserId,
  customers,
  loading,
  searchTerm,
  setSearchTerm,
  actionId,
  editingId,
  editForm,
  setEditForm,
  loadCustomers,
  handleStartEdit,
  handleCancelEdit,
  handleSaveEdit,
  handleResetPassword,
  handleUpdateRole,
  handleDelete,
  filteredCustomers,
  canEditRecord,
  canResetPasswordFor,
  canDeleteRecord,
  isAdmin,
  isShura
}: CustomerManagementViewProps) {
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
                  <tr key={c.id} style={{ opacity: actionId === String(c.id) ? 0.6 : 1 }}>
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
                          {editingId === String(c.id) ? (
                            <input
                              className="form-input form-input--sm"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                          ) : (
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                          )}
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>ID: {c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 'var(--font-sm)' }}>
                        {editingId === String(c.id) ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiMail style={{ color: 'var(--gray-400)' }} />
                              <input
                                className="form-input form-input--sm"
                                value={editForm.email || ''}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              />
                            </div>
                            <input
                               className="form-input form-input--sm"
                               placeholder="Telefone"
                               value={editForm.phone || ''}
                               onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiMail style={{ color: 'var(--gray-400)' }} />
                              {c.email || 'Sem e-mail cadastrado'}
                            </div>
                            {c.phone && <div style={{ color: 'var(--gray-500)' }}>{c.phone}</div>}
                            {c.customer_type === 'guest' && (
                              <div style={{ color: 'var(--gray-500)' }}>Cliente convidado sem conta de acesso</div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge--${c.customer_type === 'guest' ? 'neutral' : c.role === 'shura' ? 'shura' : c.role === 'admin' ? 'primary' : 'neutral'}`}>
                        <FiShield style={{ marginRight: '4px' }} />
                        {c.customer_type === 'guest' ? 'Convidado' : getRoleLabel(c.role)}
                      </span>
                    </td>
                    <td>
                      {c.customer_type === 'guest' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>
                          <FiUsers /> Pedido avulso
                        </div>
                      ) : c.is_active !== false ? (
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
                        {editingId === String(c.id) ? (
                          <>
                            <button
                              className="btn btn--sm btn--primary"
                              title="Salvar"
                              onClick={() => handleSaveEdit(c.id)}
                            >
                              <FiSave />
                            </button>
                            <button
                              className="btn btn--sm btn--secondary"
                              title="Cancelar"
                              onClick={handleCancelEdit}
                            >
                              <FiXCircle />
                            </button>
                          </>
                        ) : (
                          <>
                            {isAdmin && c.customer_type === 'registered' && c.role === 'customer' && String(c.id) !== currentUserId && (
                              <button
                                className="btn btn--sm btn--secondary"
                                title="Promover para Administrador"
                                onClick={() => handleUpdateRole(c.id, c.name, 'admin')}
                                disabled={!!actionId}
                              >
                                <FiUserCheck />
                              </button>
                            )}
                            {isAdmin && c.customer_type === 'registered' && c.role === 'admin' && String(c.id) !== currentUserId && (
                              <button
                                className="btn btn--sm btn--secondary"
                                title="Rebaixar para Cliente"
                                onClick={() => handleUpdateRole(c.id, c.name, 'customer')}
                                disabled={!!actionId}
                              >
                                <FiUserX />
                              </button>
                            )}
                            {isShura && c.customer_type === 'registered' && c.role !== 'shura' && String(c.id) !== currentUserId && (
                              <button
                                className="btn btn--sm btn--primary"
                                title="Promover a SHURA"
                                onClick={() => handleUpdateRole(c.id, c.name, 'shura')}
                                disabled={!!actionId}
                              >
                                <FiShield />
                              </button>
                            )}
                            {isShura && c.customer_type === 'registered' && c.role === 'shura' && String(c.id) !== currentUserId && (
                              <button
                                className="btn btn--sm btn--secondary"
                                title="Rebaixar SHURA para Administrador"
                                onClick={() => handleUpdateRole(c.id, c.name, 'admin')}
                                disabled={!!actionId}
                              >
                                <FiShield />
                              </button>
                            )}
                            {canEditRecord(c) && (
                              <button
                                className="btn btn--sm btn--secondary"
                                title="Editar Usuário"
                                onClick={() => handleStartEdit(c)}
                                disabled={!!actionId}
                              >
                                <FiEdit />
                              </button>
                            )}
                            <button
                              className="btn btn--sm btn--secondary"
                              title="Resetar Senha"
                              onClick={() => handleResetPassword(c.id, c.name)}
                              disabled={!!actionId || !canResetPasswordFor(c)}
                            >
                              <FiKey />
                            </button>
                            <button
                              className="btn btn--sm btn--danger"
                              title="Excluir"
                              onClick={() => handleDelete(c.id, c.name)}
                              disabled={!!actionId || !canDeleteRecord(c)}
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
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
