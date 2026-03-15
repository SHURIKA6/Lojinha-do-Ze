'use client';

import React from 'react';

/**
 * ErrorBoundary component to catch rendering errors and show a fallback UI.
 * Now using inline styles to avoid styled-jsx issues in RootLayout.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: '#f8fafc',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            padding: '2.5rem',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '1rem'
            }}>Oops! Algo deu errado.</h1>
            <p style={{
              color: '#64748b',
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              Ocorreu um erro inesperado. Por favor, tente atualizar a página ou volte mais tarde.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Recarregar Página
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#f1f5f9',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#dc2626',
                textAlign: 'left',
                overflowX: 'auto'
              }}>
                {this.state.error && this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
