'use client';

import React, { useState } from 'react';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiSave, 
  FiAlertCircle,
  FiCheckCircle,
  FiShield,
  FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { updateProfile } from '@/lib/api';
import '@/app/admin/dashboard.css';

export default function ProfileSettings() {
  const { user, setUser, isShura } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      addToast('Nome e e-mail são obrigatórios.', 'error');
      return;
    }

    try {
      setLoading(true);
      const updatedUser = await updateProfile({
        name: formData.name,
        email: formData.email
      });
      
      setUser(updatedUser);
      addToast('Perfil atualizado com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      addToast('Não foi possível salvar as alterações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      addToast('Preencha os campos de senha.', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ password: formData.password });
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      addToast('Senha alterada com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao mudar senha:', err);
      addToast('Erro ao atualizar senha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn surface-stack">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiUser />
            Configurações
          </span>
          <h1>Configurações de Perfil</h1>
          <p className="page-header__subtitle">
            Gerencie suas informações pessoais e credenciais de acesso como administrador.
          </p>
        </div>
      </div>

      <div className="grid grid--cols-2">
        {/* Informações Básicas */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel__header" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiUser className="text-primary" />
            <h4 style={{ margin: 0 }}>Informações Pessoais</h4>
          </div>
          <form className="panel__content" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div className="admin-input-group">
                <input 
                  type="text" 
                  name="name"
                  className="form-input" 
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                />
                <FiUser className="admin-input-group__icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail Administrativo</label>
              <div className="admin-input-group">
                <input 
                  type="email" 
                  name="email"
                  className="form-input" 
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                />
                <FiMail className="admin-input-group__icon" />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-2)' }}>
              <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? <FiRefreshCw className="animate-spin" /> : <FiSave />} 
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>

        {/* Segurança */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel__header" style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiLock className="text-warning" />
            <h4 style={{ margin: 0 }}>Segurança e Acesso</h4>
          </div>
          <form className="panel__content" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Nova Senha</label>
              <div className="admin-input-group">
                <input 
                  type="password" 
                  name="password"
                  className="form-input" 
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <FiLock className="admin-input-group__icon" />
              </div>
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--gray-500)', marginTop: '4px' }}>
                Mínimo de 8 caracteres. Use letras, números e símbolos.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Nova Senha</label>
              <div className="admin-input-group">
                <input 
                  type="password" 
                  name="confirmPassword"
                  className="form-input" 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <FiLock className="admin-input-group__icon" />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-2)' }}>
              <button 
                type="submit" 
                className="btn btn--secondary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? <FiRefreshCw className="animate-spin" /> : <FiShield />} 
                Atualizar Senha
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`panel ${isShura ? 'panel--shura' : ''}`} style={{ marginTop: 'var(--space-6)', borderLeft: '4px solid var(--primary-500)' }}>
        <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            backgroundColor: isShura ? 'var(--amber-100)' : 'var(--primary-100)',
            color: isShura ? 'var(--amber-700)' : 'var(--primary-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: isShura ? '0 0 15px var(--amber-200)' : 'none'
          }}>
            {isShura ? '💎' : <FiShield />}
          </div>
          <div>
            <h4 style={{ margin: 0 }}>Nível de Acesso: {isShura ? '💎 S H U R A' : 'Administrador'}</h4>
            <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--gray-600)' }}>
              {isShura 
                ? 'Você detém o cargo máximo e absoluto sobre toda a infraestrutura e dados do sistema.' 
                : 'Sua conta possui permissões totais sobre o sistema, faturamento e base de clientes.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
