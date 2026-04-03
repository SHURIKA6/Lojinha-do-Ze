'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPageClient() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, isAdmin, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      router.replace(isAdmin ? '/admin/dashboard' : '/conta');
    }
  }, [user, loading, isAdmin, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(identifier, password);
      setSubmitting(false);

      if (result?.success) {
        // Easter egg: Redirecionar para a página especial se for o usuário de teste
        if (result.easterEgg) {
          router.push('/easter-egg');
          return;
        }
        
        router.push(result.user.role === 'admin' ? '/admin/dashboard' : '/conta');
        return;
      }

      setError(result?.error || 'Erro ao fazer login. Verifique seus dados.');
    } catch (error) {
      setSubmitting(false);
      setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-fadeIn">
        <section className="login-card">
          <header className="login-card__header">
            <div className="login-card__logo">LZ</div>
            <h1 className="login-card__title">Entrar</h1>
            <p className="login-card__subtitle">Acesse sua conta com e-mail ou telefone</p>
          </header>

          <form onSubmit={handleSubmit} className="login-card__form">
            {error ? (
              <div className="login-card__error" role="alert" aria-live="assertive">
                {error}
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label" htmlFor="login-identifier">
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

            <button
              className="btn btn--primary btn--full btn--lg"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Entrando...' : 'Acessar conta'}
            </button>
          </form>

            <p>
              Recebeu um convite? <Link href="/ativar-conta">Ativar conta</Link>
            </p>
        </section>
      </div>
    </div>
  );
}
