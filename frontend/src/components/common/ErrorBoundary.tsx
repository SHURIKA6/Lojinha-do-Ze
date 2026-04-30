'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * ErrorBoundary component to catch rendering errors and show a premium fallback UI.
 * Redesigned with glassmorphism and vibrant gradients.
 */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'radial-gradient(circle at top right, #667eea 0%, #764ba2 100%)',
          fontFamily: 'var(--font-body), system-ui, -apple-system, sans-serif',
          color: '#ffffff'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1.5rem',
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
            }}>
              🌿
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              marginBottom: '1rem',
              letterSpacing: '-0.025em',
              lineHeight: '1.2'
            }}>A conexão mística falhou</h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '2.5rem',
              fontSize: '1.125rem',
              lineHeight: '1.6'
            }}>
              Parece que o "Guardião da Lojinha" tropeçou em um galho. O sistema está sendo restaurado agora mesmo.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={this.handleReset}
                style={{
                  background: 'white',
                  color: '#764ba2',
                  padding: '1rem 2rem',
                  borderRadius: '1rem',
                  fontWeight: '700',
                  fontSize: '1rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                }}
              >
                Restaurar Energia
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div style={{
                marginTop: '3rem',
                padding: '1.5rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '1rem',
                textAlign: 'left',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Detalhes Técnicos</p>
                <code style={{
                  fontSize: '0.875rem',
                  color: '#fb7185',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace'
                }}>
                  {this.state.error && this.state.error.toString()}
                </code>
              </div>
            )}
          </div>
          
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />
        </div>
      );
    }

    return this.props.children;
  }
}
