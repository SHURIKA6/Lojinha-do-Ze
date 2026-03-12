'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/api';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave } from 'react-icons/fi';

export default function ClientePerfilPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '' });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try { await updateProfile(form); setSaved(true); setTimeout(() => setSaved(false), 3000); } catch (err) { console.error(err); }
  };

  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-2)' }}>Meu Perfil</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 'var(--space-8)' }}>Gerencie suas informações pessoais</p>
      <div style={{ maxWidth: '560px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 'var(--font-xl)' }}>{user?.avatar || 'U'}</div>
            <div><h3 style={{ marginBottom: '2px' }}>{user?.name}</h3><span className="badge badge--neutral">Cliente</span></div>
          </div>
          <div className="form-group"><label className="form-label"><FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Nome</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="form-group"><label className="form-label"><FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="form-group"><label className="form-label"><FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Telefone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="form-group"><label className="form-label"><FiMapPin style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Endereço</label><input className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <button className="btn btn--primary" onClick={handleSave} style={{ marginTop: 'var(--space-2)' }}><FiSave /> Salvar</button>
          {saved && <div style={{ marginTop: 'var(--space-3)', color: 'var(--success-600)', fontSize: 'var(--font-sm)', fontWeight: 600 }}>✓ Perfil atualizado com sucesso!</div>}
        </div>
      </div>
    </div>
  );
}
