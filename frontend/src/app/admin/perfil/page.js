'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/api';
import { FiUser, FiSave, FiMail, FiPhone } from 'react-icons/fi';

export default function PerfilPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header"><div><h1>Perfil</h1><p className="page-header__subtitle">Gerencie suas informações pessoais</p></div></div>
      <div style={{ maxWidth: '600px' }}>
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 'var(--font-2xl)' }}>
              {user?.avatar || 'U'}
            </div>
            <div><h3>{user?.name}</h3><span className="badge badge--primary" style={{ marginTop: 'var(--space-2)' }}>{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</span></div>
          </div>
          <div className="form-group"><label className="form-label"><FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Nome Completo</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label"><FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label className="form-label"><FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Telefone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <button className="btn btn--primary" onClick={handleSave} style={{ marginTop: 'var(--space-2)' }}><FiSave /> Salvar Alterações</button>
          {saved && <div style={{ marginTop: 'var(--space-3)', color: 'var(--success-600)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>✓ Perfil atualizado com sucesso!</div>}
        </div>
      </div>
    </div>
  );
}
