'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/core/contexts/AuthContext';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  identifier: z.string().min(1, 'E-mail ou telefone é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPageClient() {
  const [error, setError] = useState('');
  const { user, loading, isAdmin, login } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      router.replace(isAdmin ? '/admin/dashboard' : '/conta');
    }
  }, [user, loading, isAdmin, router]);

  const onSubmit = async (data: LoginForm) => {
    setError('');

    try {
      const result = await login(data.identifier, data.password);

      if (result?.success) {
        router.push(result.user?.role === 'admin' ? '/admin/dashboard' : '/conta');
        return;
      }

      setError(result?.error || 'Erro ao fazer login. Verifique seus dados.');
    } catch (err) {
      setError('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell animate-fadeIn">
        <section className="login-card">
          <header className="login-card__header">
            <div className="login-card__logo">
              <img src="/images/logo.png" alt="Lojinha do Zé Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
            </div>
            <h1 className="login-card__title">Entrar</h1>
            <p className="login-card__subtitle">Acesse sua conta com e-mail ou telefone</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="login-card__form">
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
                {...register('identifier')}
                placeholder="seu@email.com ou (11) 99999-9999"
                autoComplete="username"
              />
              {errors.identifier && (
                <span className="form-error" style={{ color: 'red', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>{errors.identifier.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Senha
              </label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                {...register('password')}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <span className="form-error" style={{ color: 'red', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>{errors.password.message}</span>
              )}
            </div>

            <button
              className="btn btn--primary btn--full btn--lg"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Acessar conta'}
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
