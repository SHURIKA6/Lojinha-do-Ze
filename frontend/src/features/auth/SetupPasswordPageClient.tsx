'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowRight, FiKey, FiLock } from 'react-icons/fi';
import { setupPassword } from '@/core/api';
import { useAuth } from '@/core/contexts/AuthContext';
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

  const handleSubmit = async (event: React.FormEvent) => {
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
    } catch (submitError: any) {
      setError(submitError.message || 'Não foi possível ativar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-fadeIn" style={{ justifyContent: 'center' }}>
        <section className="login-card">
          <div className="login-card__header">
            <div className="login-card__logo">
              <img src="/images/logo.png" alt="Lojinha do Zé Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            </div>
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

            {!token && (
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
                  required
                />
              </div>
            )}

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
