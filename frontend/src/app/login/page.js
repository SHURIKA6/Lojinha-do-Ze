'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiLock, FiMail, FiLogIn, FiInfo } from 'react-icons/fi';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(identifier, password);
    setLoading(false);

    if (result?.success) {
      if (result.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/cliente');
      }
      return;
    }

    setError(result?.error || 'Erro ao fazer login');
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fadeIn">
        <div className="login-card__header">
          <div className="login-card__logo">LZ</div>
          <h1 className="login-card__title">Lojinha do Zé</h1>
          <p className="login-card__subtitle">Acesse com e-mail ou telefone e senha</p>
        </div>

        <div
          style={{
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--warning-50)',
            color: 'var(--warning-700)',
            fontSize: 'var(--font-sm)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <FiInfo style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            O login sem senha por telefone foi removido por segurança. Se voce nao tem senha,
            solicite uma senha temporaria para a loja.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="login-card__form">
          {error && <div className="login-card__error">{error}</div>}

          <div className="form-group">
            <label className="form-label">
              <FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              E-mail ou Telefone
            </label>
            <input
              className="form-input"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="seu@email.com ou (11) 99999-9999"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiLock style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
              Senha
            </label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : <><FiLogIn /> Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
