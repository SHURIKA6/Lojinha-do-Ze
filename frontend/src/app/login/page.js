'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLock, FiMail, FiLogIn, FiPhone, FiUser } from 'react-icons/fi';

export default function LoginPage() {
  const [method, setMethod] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [requireName, setRequireName] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithPhone } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (method === 'email') {
      result = await login(email, password);
    } else {
      try {
        const { loginPhone } = await import('@/lib/api');
        const data = await loginPhone(phone, name);
        result = { success: true, user: data.user };
        // We set it in AuthContext but we also need to trigger navigation
        loginWithPhone(phone); // Will update context state
      } catch (err) {
        if (err.message.includes('informe seu nome')) {
          setRequireName(true);
          result = { success: false, error: err.message };
        } else {
          result = { success: false, error: err.message };
        }
      }
    }
    
    setLoading(false);

    if (result && result.success) {
      if (result.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/cliente');
      }
    } else if (result) {
      setError(result.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fadeIn">
        <div className="login-card__header">
          <div className="login-card__logo">LZ</div>
          <h1 className="login-card__title">Lojinha do Zé</h1>
          <p className="login-card__subtitle">Bem-vindo(a) de volta</p>
        </div>

        <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
          <button className={`tab ${method === 'email' ? 'active' : ''}`} type="button" onClick={() => { setMethod('email'); setError(''); }}>E-mail Administrativo</button>
          <button className={`tab ${method === 'phone' ? 'active' : ''}`} type="button" onClick={() => { setMethod('phone'); setError(''); }}>Telefone Cliente</button>
        </div>

        <form onSubmit={handleSubmit} className="login-card__form">
          {error && <div className="login-card__error">{error}</div>}

          {method === 'email' ? (
            <>
              <div className="form-group">
                <label className="form-label"><FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />E-mail</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label"><FiLock style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Senha</label>
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label"><FiPhone style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Telefone</label>
                <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
              </div>
              {requireName && (
                <div className="form-group animate-fadeIn">
                  <label className="form-label"><FiUser style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Nome Completo</label>
                  <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Como gostaria de ser chamado?" required />
                </div>
              )}
            </>
          )}

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : <><FiLogIn /> Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
