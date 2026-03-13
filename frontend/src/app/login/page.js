'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiArrowRight, FiClock, FiInfo, FiLock, FiMail, FiShield, FiUser } from 'react-icons/fi';

const benefits = [
  {
    icon: FiShield,
    title: 'Acesso mais seguro',
    text: 'O login por identificador e senha substitui o fluxo improvisado e protege clientes e operação.',
  },
  {
    icon: FiClock,
    title: 'Acompanhamento fácil',
    text: 'Clientes acompanham pedidos e perfil no mesmo idioma visual da loja.',
  },
  {
    icon: FiUser,
    title: 'Administração centralizada',
    text: 'Admin entra no painel com o mesmo sistema de autenticação da experiência pública.',
  },
];

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
      router.push(result.user.role === 'admin' ? '/admin/dashboard' : '/cliente');
      return;
    }

    setError(result?.error || 'Erro ao fazer login');
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-fadeIn">
        <section className="login-panel">
          <div className="login-panel__copy">
            <span className="landing-eyebrow">
              <FiShield />
              Acesso autenticado
            </span>
            <h1>Entre com segurança na nova experiência da Lojinha do Zé.</h1>
            <p>
              Um login mais profissional para clientes e operação, mantendo o fluxo simples e direto.
            </p>
          </div>

          <div className="login-panel__list">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div key={title} className="login-panel__item">
                <Icon />
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="login-card">
          <div className="login-card__header">
            <div className="login-card__logo">LZ</div>
            <h1 className="login-card__title">Entrar</h1>
            <p className="login-card__subtitle">Use e-mail ou telefone com a senha cadastrada.</p>
          </div>

          <div className="login-note">
            <FiInfo />
            <span>
              O login sem senha por telefone foi removido por segurança. Se você ainda não tem senha,
              solicite uma temporária para a loja.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="login-card__form">
            {error && <div className="login-card__error">{error}</div>}

            <div className="form-group">
              <label className="form-label">
                <FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                E-mail ou telefone
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

            <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={loading}>
              {loading ? (
                'Entrando...'
              ) : (
                <>
                  <FiArrowRight />
                  Acessar conta
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
