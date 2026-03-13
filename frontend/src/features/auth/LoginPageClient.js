'use client';

import Link from 'next/link';
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

export default function LoginPageClient() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
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
              Se você ainda não ativou sua conta, peça um novo convite para a loja ou use o link de
              ativação recebido.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="login-card__form">
            {error ? (
              <div className="login-card__error" role="alert" aria-live="assertive">
                {error}
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label" htmlFor="login-identifier">
                <FiMail style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                E-mail ou telefone
              </label>
              <input
                id="login-identifier"
                className="form-input"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="seu@email.com ou (11) 99999-9999"
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                <FiLock style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Senha
              </label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
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

          <p className="login-card__footer">
            Recebeu um convite? <Link href="/ativar-conta">Ativar conta</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
