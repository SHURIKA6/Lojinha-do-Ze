'use client';

import React, { useState } from 'react';
import { useAuth } from '@/core/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { updateProfile } from '@/core/api';
import { FiMail, FiPhone, FiSave, FiUser } from 'react-icons/fi';

export default function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await updateProfile(form);
      await refreshUser();
      setSaved(true);
      toast.success('Perfil atualizado com sucesso.');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Não foi possível atualizar o perfil.');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiUser />
            Conta administrativa
          </span>
          <h1>Perfil</h1>
          <p className="page-header__subtitle">
            Atualize seus dados pessoais dentro do novo shell operacional.
          </p>
        </div>
      </div>

      <div className="profile-shell">
        <div className="card">
          <div className="profile-identity">
            <div className="profile-identity__avatar">{user?.avatar || 'U'}</div>
            <div>
              <h3>{user?.name}</h3>
              <span className="badge badge--primary">
                {user?.role === 'admin' ? 'Administrador' : 'Cliente'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              Nome completo
            </label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              E-mail
            </label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              Telefone
            </label>
            <input
              className="form-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <button type="button" className="btn btn--primary" onClick={handleSave}>
            <FiSave />
            Salvar alterações
          </button>

          {saved && <div className="success-inline">Perfil atualizado com sucesso.</div>}
        </div>
      </div>
    </div>
  );
}
