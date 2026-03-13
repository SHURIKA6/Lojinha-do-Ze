'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/api';
import { FiMail, FiMapPin, FiPhone, FiSave, FiUser } from 'react-icons/fi';

export default function ClientePerfilPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            <FiUser />
            Dados pessoais
          </span>
          <h1>Meu perfil</h1>
          <p className="page-header__subtitle">
            Mantenha suas informações de contato e entrega sempre atualizadas.
          </p>
        </div>
      </div>

      <div className="profile-shell">
        <div className="card">
          <div className="profile-identity">
            <div className="profile-identity__avatar">{user?.avatar || 'U'}</div>
            <div>
              <h3>{user?.name}</h3>
              <span className="badge badge--primary">Cliente</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              Nome
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

          <div className="form-group">
            <label className="form-label">
              <FiMapPin style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              Endereço
            </label>
            <input
              className="form-input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <button className="btn btn--primary" onClick={handleSave}>
            <FiSave />
            Salvar alterações
          </button>

          {saved && <div className="success-inline">Perfil atualizado com sucesso.</div>}
        </div>
      </div>
    </div>
  );
}
