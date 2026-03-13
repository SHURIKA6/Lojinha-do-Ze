'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowRight, FiCheckCircle, FiKey, FiLock, FiShield } from 'react-icons/fi';
import { setupPassword } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function SetupPasswordPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token') || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await setupPassword({
        token: token || undefined,
        code: token ? undefined : code,
        password,
        confirmPassword,
      });

      const user = await refreshUser().catch(() => null);
      toast.success('Conta ativada com sucesso. Você já está autenticado.');
      router.push(user?.role === 'admin' ? '/admin/dashboard' : '/conta');
    } catch (submitError) {
      setError(submitError.message || 'Não foi possível ativar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-fadeIn">
        <section className="login-panel">
          <div className="login-panel__copy">
            <span className="landing-eyebrow">
              <FiShield />
              Ativação segura
            </span>
            <h1>Defina sua senha para concluir o acesso à Lojinha do Zé.</h1>
            <p>
              Use o link do convite ou informe o código recebido pela loja para ativar sua conta de
              forma segura.
            </p>
          </div>

          <div className="login-panel__list">
            <div className="login-panel__item">
              <FiCheckCircle />
              <div>
                <strong>Convite temporário</strong>
                <p>Links e códigos expiram automaticamente e não podem ser reutilizados.</p>
              </div>
            </div>
            <div className="login-panel__item">
              <FiKey />
              <div>
                <strong>Senha criada por você</strong>
                <p>Depois da ativação, o acesso passa a ser feito pelo login normal.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card__header">
            <div className="login-card__logo">LZ</div>
            <h1 className="login-card__title">Ativar conta</h1>
            <p className="login-card__subtitle">
              {token ? 'Convite detectado no link.' : 'Cole o código do convite se necessário.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-card__form">
            {error ? (
              <div className="login-card__error" role="alert" aria-live="assertive">
                {error}
              </div>
            ) : null}

            {!token ? (
              <div className="form-group">
                <label className="form-label" htmlFor="setup-code">
                  <FiKey style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                  Código do convite
                </label>
                <input
                  id="setup-code"
                  className="form-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="Ex.: ABCD1234"
                />
              </div>
            ) : null}

            <div className="form-group">
              <label className="form-label" htmlFor="setup-password">
                <FiLock style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Nova senha
              </label>
              <input
                id="setup-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="setup-confirm-password">
                <FiLock style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                Confirmar senha
              </label>
              <input
                id="setup-confirm-password"
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita sua senha"
                required
                autoComplete="new-password"
              />
            </div>

            <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={loading}>
              {loading ? (
                'Ativando...'
              ) : (
                <>
                  <FiArrowRight />
                  Ativar acesso
                </>
              )}
            </button>
          </form>

          <p className="login-card__footer">
            Já ativou a conta? <Link href="/login">Ir para o login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
