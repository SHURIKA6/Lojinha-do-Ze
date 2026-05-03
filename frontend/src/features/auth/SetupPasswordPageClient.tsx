/**
 * Feature: SetupPasswordPageClient
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowRight, FiKey, FiLock } from 'react-icons/fi';
import { setupPassword } from '@/core/api';
import { useAuth } from '@/core/contexts/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const setupPasswordSchema = z.object({
  code: z.string().optional(),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type SetupPasswordForm = z.infer<typeof setupPasswordSchema>;

export default function SetupPasswordPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [error, setError] = useState('');
  
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<SetupPasswordForm>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: {
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SetupPasswordForm) => {
    setError('');

    if (!token && !data.code) {
      setError('O código do convite é obrigatório se o link não possuir token.');
      return;
    }

    try {
      await setupPassword({
        token: token || undefined,
        code: token ? undefined : data.code,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      const user = await refreshUser().catch(() => null);
      toast.success('Conta ativada com sucesso. Você já está autenticado.');
      router.push(user?.role === 'admin' ? '/admin/dashboard' : '/conta');
    } catch (submitError: any) {
      setError(submitError.message || 'Não foi possível ativar sua conta.');
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

          <form onSubmit={handleSubmit(onSubmit)} className="login-card__form">
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
                  {...register('code', {
                    onChange: (e) => {
                      setValue('code', e.target.value.toUpperCase());
                    }
                  })}
                  placeholder="Ex.: ABCD1234"
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
                {...register('password')}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
              />
              {errors.password && (
                <span className="form-error" style={{ color: 'red', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>{errors.password.message}</span>
              )}
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
                {...register('confirmPassword')}
                placeholder="Repita sua senha"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="form-error" style={{ color: 'red', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>{errors.confirmPassword.message}</span>
              )}
            </div>

            <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
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
