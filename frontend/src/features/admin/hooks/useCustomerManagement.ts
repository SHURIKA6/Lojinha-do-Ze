import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getRoleLabel, type UserRole } from '@/lib/roles';
import {
  getCustomers,
  deleteCustomer,
  resetCustomerPassword,
  updateUserRole,
  updateCustomer,
} from '@/lib/api';
import { CustomerRecord } from '@/types';

type EditableCustomerForm = {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
};

export function useCustomerManagement() {
  const { user, isAdmin, isShura } = useAuth();
  const { addToast } = useToast();

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditableCustomerForm>({});

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
    if (isAdmin || isShura) {
      loadCustomers();
    }
  }, [isAdmin, isShura]);

  const handleStartEdit = (customer: CustomerRecord) => {
    setEditingId(String(customer.id));
    setEditForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      cpf: customer.cpf || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (id: string | number) => {
    if (!editForm.name || (!editForm.email && !editForm.phone)) {
      addToast('Nome e pelo menos um contato são obrigatórios.', 'error');
      return;
    }

    try {
      setActionId(String(id));
      const updated = await updateCustomer(id, editForm);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      addToast('Informações atualizadas.', 'success');
      setEditingId(null);
    } catch (err) {
      console.error('Erro ao editar:', err);
      addToast('Erro ao salvar edições.', 'error');
    } finally {
      setActionId(null);
    }
  };

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

  const handleUpdateRole = async (id: string | number, name: string, newRole: UserRole) => {
    const roleName = getRoleLabel(newRole);
    const password = window.prompt(`Confirmação de Segurança: Digite sua senha administrativa para definir ${name} como ${roleName}:`);

    if (password === null) return;
    if (!password) {
      addToast('A senha é obrigatória para esta ação.', 'error');
      return;
    }

    try {
      setActionId(String(id));
      await updateUserRole(id, newRole, password);
      addToast(`${name} agora é ${roleName}.`, 'success');
      await loadCustomers();
    } catch (err: any) {
      console.error('Erro ao atualizar cargo:', err);
      addToast(err.message || 'Erro ao atualizar o cargo.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`EXCLUSÃO CRÍTICA: Tem certeza que deseja remover ${name} do sistema?`)) return;
    const password = window.prompt(`Digite sua senha administrativa para excluir ${name}:`);

    if (password === null) return;
    if (!password) {
      addToast('A senha é obrigatória para excluir usuários.', 'error');
      return;
    }

    try {
      setActionId(id);
      await deleteCustomer(id, password);
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
        (c.email || '').toLowerCase().includes(searchLower) ||
        (c.phone || '').includes(searchTerm)
      );
    });
  }, [customers, searchTerm]);

  const currentUserId = String(user?.id ?? '');

  const canEditRecord = (customer: CustomerRecord) => {
    if (customer.customer_type !== 'registered' || String(customer.id) === currentUserId) return false;
    if (customer.role === 'shura') return false;
    if (customer.role === 'admin' && !isShura) return false;
    return isAdmin || isShura;
  };

  const canResetPasswordFor = (customer: CustomerRecord) => {
    if (customer.customer_type !== 'registered' || String(customer.id) === currentUserId) return false;
    if (customer.role === 'shura') return false;
    if (customer.role === 'admin' && !isShura) return false;
    return isAdmin || isShura;
  };

  const canDeleteRecord = (customer: CustomerRecord) => {
    if (customer.customer_type !== 'registered' || String(customer.id) === currentUserId) return false;
    if (customer.role === 'shura') return false;
    if (customer.role === 'admin' && !isShura) return false;
    return isAdmin || isShura;
  };

  return {
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
  };
}
