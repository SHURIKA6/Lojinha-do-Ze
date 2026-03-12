'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLock, FiMail, FiLogIn } from 'react-icons/fi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      if (result.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/cliente');
      }
    } else {
      setError(result.error || 'E-mail ou senha incorretos');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fadeIn">
        <div className="login-card__header">
          <div className="login-card__logo">LZ</div>
          <h1 className="login-card__title">Lojinha do Zé</h1>
          <p className="login-card__subtitle">Gestão de Produtos Fitoterápicos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-card__form">
          {error && <div className="login-card__error">{error}</div>}

          <div className="form-group">
            <label className="form-label"><FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />E-mail</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>

          <div className="form-group">
            <label className="form-label"><FiLock style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />Senha</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : <><FiLogIn /> Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
