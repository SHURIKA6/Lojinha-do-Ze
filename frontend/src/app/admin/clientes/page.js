'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useConfirm } from '@/components/ui/ConfirmDialogProvider';
import { useToast } from '@/components/ui/ToastProvider';
import {
  createCustomer,
  deleteCustomer,
  formatCurrency,
  formatDate,
  getCustomerOrders,
  getCustomers,
  getStatusLabel,
  getStatusVariant,
  sendCustomerInvite,
  updateCustomer,
  updateUserRole,
} from '@/lib/api';
import {
  FiEdit2,
  FiEye,
  FiKey,
  FiLink2,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';

const initialForm = { name: '', email: '', phone: '', cpf: '', address: '', notes: '' };

export default function ClientesPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [roleForm, setRoleForm] = useState({ role: '', password: '' });

  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.phone?.includes(search) ||
        customer.role?.toLowerCase().includes(term)
      );
    });
  }, [customers, search]);

  const openNew = () => {
    setEditingCustomer(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: customer.cpf || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    setForm(initialForm);
  };

  const openRoleModal = (customer) => {
    setSelectedCustomer(customer);
    setRoleForm({ role: customer.role === 'admin' ? 'customer' : 'admin', password: '' });
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setSelectedCustomer(null);
    setRoleForm({ role: '', password: '' });
  };

  const handleUpdateRole = async () => {
    if (!roleForm.password) {
      toast.error('Informe a senha administrativa.');
      return;
    }

    setSaving(true);
    try {
      await updateUserRole(selectedCustomer.id, roleForm.role, roleForm.password);
      toast.success('Cargo atualizado com sucesso.');
      closeRoleModal();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Não foi possível atualizar o cargo.');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setDetailOpen(true);
    setLoadingOrders(true);

    try {
      const orders = await getCustomerOrders(customer.id);
      setCustomerOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Não foi possível carregar o histórico.');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, form);
        toast.success('Usuário atualizado com sucesso.');
      } else {
        const createdCustomer = await createCustomer(form);
        setInviteData({
          name: createdCustomer.name,
          identifier: createdCustomer.email || createdCustomer.phone || 'Sem identificador',
          setupUrl: createdCustomer.invite?.setupUrl || '',
          setupCode: createdCustomer.invite?.setupCode || '',
          expiresAt: createdCustomer.invite?.expiresAt || '',
        });
        toast.success('Usuário criado com convite de ativação.');
      }

      closeFormModal();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async (customer) => {
    const confirmed = await confirm({
      title: 'Gerar novo convite',
      description: 'O convite anterior será invalidado automaticamente.',
      body: `Deseja gerar um novo convite de ativação para ${customer.name}?`,
      confirmLabel: 'Gerar convite',
      cancelLabel: 'Cancelar',
      tone: 'primary',
    });

    if (!confirmed) {
      return;
    }

    try {
      const result = await sendCustomerInvite(customer.id);
      setInviteData({
        name: result.name,
        identifier: result.email || result.phone || 'Sem identificador',
        setupUrl: result.invite?.setupUrl || '',
        setupCode: result.invite?.setupCode || '',
        expiresAt: result.invite?.expiresAt || '',
      });
      toast.success('Novo convite gerado com sucesso.');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Não foi possível gerar o convite.');
    }
  };

  const handleDelete = async (customer) => {
    const confirmed = await confirm({
      title: 'Excluir usuário',
      description: 'Esta ação remove o cadastro do usuário.',
      body: `Tem certeza que deseja excluir ${customer.name}?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      toast.success('Usuário excluído com sucesso.');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Não foi possível excluir o usuário.');
    }
  };

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiUser />
            Relacionamento
          </span>
          <h1>Usuários e Clientes</h1>
          <p className="page-header__subtitle">
            {loading
              ? 'Carregando usuários...'
              : `${customers.length} usuários cadastrados (Admins e Clientes) com acesso controlado.`}
          </p>
        </div>

        <div className="page-header__actions">
          <button type="button" className="btn btn--primary" onClick={openNew}>
            <FiPlus />
            Novo cliente
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="table-search">
          <FiSearch className="table-search__icon" />
          <input
            placeholder="Buscar por nome, telefone, e-mail ou tipo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="table-container">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Desde</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    <div className="app-loader" style={{ padding: 'var(--space-8)' }}>
                      <div className="app-loader__spinner" />
                    </div>
                  </td>
                </tr>
              ) : filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {customer.avatar || 'U'}
                      </div>
                      <span style={{ fontWeight: 700 }}>{customer.name}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge badge--${customer.role === 'admin' ? 'primary' : 'secondary'}`}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {customer.role === 'admin' ? 'Administrador' : 'Cliente'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{customer.phone || '—'}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{customer.email || '—'}</td>
                  <td style={{ fontSize: 'var(--font-sm)' }}>{formatDate(customer.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        aria-label={`Ver detalhes de ${customer.name}`}
                        onClick={() => openDetail(customer)}
                      >
                        <FiEye />
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        aria-label={`Editar ${customer.name}`}
                        onClick={() => openEdit(customer)}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        aria-label={`Alterar cargo de ${customer.name}`}
                        onClick={() => openRoleModal(customer)}
                        title="Alterar cargo (Admin/Cliente)"
                      >
                        <FiShield />
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        aria-label={`Gerar convite para ${customer.name}`}
                        onClick={() => handleSendInvite(customer)}
                        title="Gerar novo convite"
                      >
                        <FiKey />
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        aria-label={`Excluir ${customer.name}`}
                        onClick={() => handleDelete(customer)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Alteração de Cargo */}
      <Modal
        isOpen={roleModalOpen}
        onClose={closeRoleModal}
        title="Alterar Cargo"
        description={`Defina o novo cargo para ${selectedCustomer?.name}`}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={closeRoleModal}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleUpdateRole} disabled={saving}>
              {saving ? 'Atualizando...' : 'Confirmar Alteração'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Novo Cargo</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className={`btn ${roleForm.role === 'customer' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setRoleForm({ ...roleForm, role: 'customer' })}
            >
              Cliente
            </button>
            <button
              type="button"
              className={`btn ${roleForm.role === 'admin' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setRoleForm({ ...roleForm, role: 'admin' })}
            >
              Administrador
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label" htmlFor="admin-password">
            Senha Administrativa
          </label>
          <input
            id="admin-password"
            type="password"
            className="form-input"
            value={roleForm.password}
            onChange={(e) => setRoleForm({ ...roleForm, password: e.target.value })}
            placeholder="Digite a senha para confirmar"
          />
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginTop: 'var(--space-2)' }}>
            Esta ação requer autorização elevada.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedCustomer?.name || 'Detalhes do usuário'}
        size="lg"
      >
        {selectedCustomer ? (
          <div>
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-3)' }}>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Cargo</span>
                <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                  {selectedCustomer.role === 'admin' ? 'Administrador' : 'Cliente'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Pessoa</span>
                <div style={{ fontWeight: 700 }}>{selectedCustomer.name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>Telefone</span>
                <div style={{ fontWeight: 700 }}>{selectedCustomer.phone || '—'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>E-mail</span>
                <div style={{ fontWeight: 700 }}>{selectedCustomer.email || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>
                  Endereço padrão
                </span>
                <div style={{ fontWeight: 700 }}>{selectedCustomer.address || '—'}</div>
              </div>
            </div>

            <h2 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-lg)' }}>
              Histórico de pedidos ({customerOrders.length})
            </h2>

            <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ marginBottom: 'var(--space-5)' }}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOrders ? (
                    <tr>
                      <td colSpan={4} className="table-empty">
                        Carregando histórico...
                      </td>
                    </tr>
                  ) : customerOrders.length > 0 ? (
                    customerOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{formatDate(order.created_at)}</td>
                        <td style={{ fontSize: 'var(--font-sm)' }}>
                          {order.delivery_type === 'retirada' ? 'Retirada' : 'Entrega'}
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(order.total)}</td>
                        <td>
                          <span className={`badge badge--${getStatusVariant(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="table-empty">
                        Nenhum pedido realizado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={modalOpen}
        onClose={closeFormModal}
        title={editingCustomer ? 'Editar usuário' : 'Novo cliente'}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={closeFormModal}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingCustomer ? 'Salvar' : 'Criar'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label" htmlFor="customer-name">
            Nome completo
          </label>
          <input
            id="customer-name"
            className="form-input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="customer-phone">
              Telefone
            </label>
            <input
              id="customer-phone"
              className="form-input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="customer-email">
              E-mail
            </label>
            <input
              id="customer-email"
              className="form-input"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="cliente@email.com"
            />
          </div>
        </div>

        <div className="soft-note" style={{ marginBottom: 'var(--space-4)' }}>
          Informe ao menos um e-mail ou telefone. O sistema gera um convite seguro para o cliente
          criar a própria senha.
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="customer-address">
            Endereço de entrega
          </label>
          <input
            id="customer-address"
            className="form-input"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="Rua, número, bairro..."
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="customer-notes">
            Observações
          </label>
          <textarea
            id="customer-notes"
            className="form-input"
            rows={2}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Preferências do cliente..."
          />
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(inviteData)}
        onClose={() => setInviteData(null)}
        title="Convite de ativação"
        description="Compartilhe o link ou o código abaixo com o cliente."
        footer={
          <button type="button" className="btn btn--primary" onClick={() => setInviteData(null)}>
            Fechar
          </button>
        }
      >
        {inviteData ? (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>
              Convite gerado para <strong>{inviteData.name}</strong>.
            </p>

            <div className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)' }}>
                Identificador
              </div>
              <div style={{ fontWeight: 700 }}>{inviteData.identifier}</div>
            </div>

            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <FiLink2 />
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)' }}>Link de ativação</span>
              </div>
              <div style={{ fontWeight: 700, wordBreak: 'break-all' }}>{inviteData.setupUrl}</div>
            </div>

            <div className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginBottom: 'var(--space-2)' }}>
                Código do convite
              </div>
              <div style={{ fontWeight: 700, letterSpacing: '0.08em' }}>{inviteData.setupCode}</div>
            </div>

            <div style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)' }}>
              Expira em {formatDate(inviteData.expiresAt)}.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
